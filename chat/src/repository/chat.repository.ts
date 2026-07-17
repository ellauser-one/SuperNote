/**
 * [INPUT]: 依赖 lib/supabase-rest（supabaseRest + createPostgrestQuery + ChatDbError）
 * [OUTPUT]: 对外提供 chatRepo — 会话 CRUD + 消息 upsert/分页查询
 * [POS]: repository 层；routes 只经此访问 chat_sessions / chat_messages；
 *        每次查询强制带 user_id（双保险，RLS 是第一道）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 游标分页：
 * - before = base64url(JSON({ created_at, id }))
 * - 解码后 lt.created_at + lt.id 过滤
 */
import {
  supabaseRest,
  createPostgrestQuery,
  ChatDbError,
} from "@/lib/supabase-rest";

// ---------------------------------------------------------------------------
// 行类型
// ---------------------------------------------------------------------------

export interface ChatSessionRow {
  id: string;
  user_id: string;
  title: string;
  title_source: "user" | "auto" | "default";
  model: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  user_id: string;
  client_id: string;
  role: "user" | "assistant";
  content: unknown; // UIMessage v5 parts jsonb
  created_at: string;
}

// ---------------------------------------------------------------------------
// 游标编码 / 解码
// ---------------------------------------------------------------------------

interface CursorPayload {
  created_at: string;
  id: string;
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeCursor(cursor: string): CursorPayload {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf-8");
    const obj = JSON.parse(json) as CursorPayload;
    if (!obj.created_at || !obj.id) throw new Error("invalid cursor");
    return obj;
  } catch {
    throw new ChatDbError(400, "INVALID_CURSOR", "无效的分页游标");
  }
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

const SESSION_COLUMNS =
  "id,user_id,title,title_source,model,deleted_at,created_at,updated_at";

/** 列出当前用户未软删的会话，按 updated_at desc */
export async function listSessions(
  userId: string,
  limit = 50,
): Promise<ChatSessionRow[]> {
  const q = createPostgrestQuery()
    .select(SESSION_COLUMNS)
    .eq("user_id", userId)
    .is("deleted_at", "null")
    .order("updated_at", false)
    .limit(limit)
    .build();
  return (await supabaseRest<ChatSessionRow[]>("chat_sessions", { query: q })) ?? [];
}

/** 新建会话 */
export async function createSession(
  userId: string,
  input: { title?: string; model?: string },
): Promise<ChatSessionRow> {
  const rows = await supabaseRest<ChatSessionRow[]>("chat_sessions", {
    method: "POST",
    body: {
      user_id: userId,
      title: input.title ?? "新对话",
      ...(input.model ? { model: input.model } : {}),
    },
    returnRepresentation: true,
    query: { select: SESSION_COLUMNS },
  });
  if (!rows?.[0]) throw new ChatDbError(500, "SESSION_CREATE_FAILED", "会话创建失败");
  return rows[0];
}

/** 更新会话（title / model）；用户改名时自动置 title_source='user' */
export async function updateSession(
  userId: string,
  sessionId: string,
  patch: { title?: string; model?: string },
): Promise<ChatSessionRow> {
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    body.title = patch.title;
    body.title_source = "user";
  }
  if (patch.model !== undefined) body.model = patch.model;

  const q = createPostgrestQuery()
    .eq("id", sessionId)
    .eq("user_id", userId)
    .is("deleted_at", "null")
    .build();

  const rows = await supabaseRest<ChatSessionRow[]>("chat_sessions", {
    method: "PATCH",
    body,
    returnRepresentation: true,
    query: { ...q, select: SESSION_COLUMNS },
  });
  if (!rows?.[0]) throw new ChatDbError(404, "SESSION_NOT_FOUND", "会话不存在");
  return rows[0];
}

/** 软删会话（写 deleted_at） */
export async function softDeleteSession(
  userId: string,
  sessionId: string,
): Promise<void> {
  const q = createPostgrestQuery()
    .eq("id", sessionId)
    .eq("user_id", userId)
    .is("deleted_at", "null")
    .build();

  const rows = await supabaseRest<ChatSessionRow[]>("chat_sessions", {
    method: "PATCH",
    body: { deleted_at: new Date().toISOString() },
    returnRepresentation: true,
    query: { ...q, select: "id" },
  });
  if (!rows?.[0]) throw new ChatDbError(404, "SESSION_NOT_FOUND", "会话不存在");
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

const MESSAGE_COLUMNS = "id,session_id,user_id,client_id,role,content,created_at";

/**
 * 批量 upsert 消息（幂等）。
 * 用 (session_id, client_id) onConflict，重复 client_id 不产生重复消息。
 */
export async function upsertMessages(
  userId: string,
  sessionId: string,
  messages: Array<{
    client_id: string;
    role: "user" | "assistant";
    content: unknown;
  }>,
): Promise<ChatMessageRow[]> {
  if (messages.length === 0) return [];

  const body = messages.map((m) => ({
    session_id: sessionId,
    user_id: userId,
    client_id: m.client_id,
    role: m.role,
    content: m.content,
  }));

  const rows = await supabaseRest<ChatMessageRow[]>("chat_messages", {
    method: "POST",
    body,
    returnRepresentation: true,
    onConflict: "session_id,client_id",
    query: { select: MESSAGE_COLUMNS },
  });
  return rows ?? [];
}

/**
 * 分页拉取历史消息（before 游标 + 默认最近 N 条）。
 * 返回按 created_at asc 排序（前端从上往下渲染）。
 */
export async function listMessages(
  userId: string,
  sessionId: string,
  options: { before?: string; limit?: number } = {},
): Promise<{
  messages: ChatMessageRow[];
  nextCursor: string | null;
}> {
  const limit = options.limit ?? 50;
  // 多取一条判断是否有下一页
  const fetchLimit = limit + 1;

  const q = createPostgrestQuery()
    .select(MESSAGE_COLUMNS)
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("created_at", false)
    .order("id", false)
    .limit(fetchLimit)
    .build();

  // 游标过滤：lt.created_at 或 (eq.created_at + lt.id)
  if (options.before) {
    const cursor = decodeCursor(options.before);
    // PostgREST 不直接支持复合游标，用 or 组合
    q["or"] = `(created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id}))`;
  }

  const rows =
    (await supabaseRest<ChatMessageRow[]>("chat_messages", { query: q })) ?? [];

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  // 反转为 asc（前端从上往下渲染）
  page.reverse();

  const nextCursor = hasMore
    ? encodeCursor({ created_at: page[0]!.created_at, id: page[0]!.id })
    : null;

  return { messages: page, nextCursor };
}

/**
 * 查找会话是否存在且属于该用户（供 chat route 入口校验用）。
 */
export async function findSession(
  userId: string,
  sessionId: string,
): Promise<ChatSessionRow | null> {
  const q = createPostgrestQuery()
    .select(SESSION_COLUMNS)
    .eq("id", sessionId)
    .eq("user_id", userId)
    .is("deleted_at", "null")
    .limit(1)
    .build();
  const rows = await supabaseRest<ChatSessionRow[]>("chat_sessions", { query: q });
  return rows?.[0] ?? null;
}

/**
 * 更新会话的 updated_at（消息落库后 touch 一下，让列表排序正确）。
 */
export async function touchSession(
  userId: string,
  sessionId: string,
): Promise<void> {
  const q = createPostgrestQuery()
    .eq("id", sessionId)
    .eq("user_id", userId)
    .build();
  await supabaseRest("chat_sessions", {
    method: "PATCH",
    body: { updated_at: new Date().toISOString() },
    query: q,
  });
}
