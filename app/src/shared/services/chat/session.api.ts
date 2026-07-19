/**
 * [INPUT]: 依赖 chatFetch（同 chat 基址 + JWT Bearer）、VITE_CHAT_BASE_URL
 * [OUTPUT]: 对外提供会话 CRUD + 消息分页 REST 客户端；类型 ChatSession / ChatMessage
 * [POS]: shared/services/chat 会话数据访问层；禁止组件直连数据库
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 信封约定：chat/ 统一返回 { code, message, data }；此层解包取 data
 */
import { chatFetch, ChatClientError, getChatBaseUrl } from "./chat-transport";

/* -------------------------------------------------------------------------- */
/* 类型                                                                        */
/* -------------------------------------------------------------------------- */

export interface ChatSession {
  id: string;
  title: string;
  title_source: "user" | "auto" | "default";
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  client_id: string;
  role: "user" | "assistant";
  content: unknown; // UIMessage parts jsonb
  created_at: string;
}

export interface MessagePage {
  messages: ChatMessage[];
  nextCursor: string | null;
}

/* -------------------------------------------------------------------------- */
/* 信封解包                                                                     */
/* -------------------------------------------------------------------------- */

interface Envelope<T> {
  code: string;
  message: string;
  data: T;
}

async function unwrap<T>(response: Response): Promise<T> {
  const body = (await response.json()) as Envelope<T>;
  if (body.code !== "ok") {
    throw new ChatClientError(
      body.message || "请求失败",
      body.code || "UNKNOWN",
      response.status,
    );
  }
  return body.data;
}

/* -------------------------------------------------------------------------- */
/* Sessions                                                                   */
/* -------------------------------------------------------------------------- */

/** GET /v1/sessions — 当前用户未软删会话列表 */
export async function listSessions(): Promise<ChatSession[]> {
  const base = getChatBaseUrl();
  const res = await chatFetch(`${base}/v1/sessions`);
  return unwrap<ChatSession[]>(res);
}

/** POST /v1/sessions — 新建会话 */
export async function createSession(
  title?: string,
): Promise<ChatSession> {
  const base = getChatBaseUrl();
  const res = await chatFetch(`${base}/v1/sessions`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
  return unwrap<ChatSession>(res);
}

/** PATCH /v1/sessions/:id — 改名 / 改 model */
export async function updateSession(
  id: string,
  patch: { title?: string; model?: string },
): Promise<ChatSession> {
  const base = getChatBaseUrl();
  const res = await chatFetch(`${base}/v1/sessions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return unwrap<ChatSession>(res);
}

/** DELETE /v1/sessions/:id — 软删 */
export async function deleteSession(id: string): Promise<void> {
  const base = getChatBaseUrl();
  const res = await chatFetch(`${base}/v1/sessions/${id}`, {
    method: "DELETE",
  });
  await unwrap<null>(res);
}

/* -------------------------------------------------------------------------- */
/* Messages                                                                   */
/* -------------------------------------------------------------------------- */

/** GET /v1/sessions/:id/messages — before 游标分页 */
export async function listSessionMessages(
  sessionId: string,
  options: { before?: string; limit?: number } = {},
): Promise<MessagePage> {
  const base = getChatBaseUrl();
  const params = new URLSearchParams();
  if (options.before) params.set("before", options.before);
  if (options.limit) params.set("limit", String(options.limit));
  const qs = params.toString();
  const url = `${base}/v1/sessions/${sessionId}/messages${qs ? `?${qs}` : ""}`;
  const res = await chatFetch(url);
  return unwrap<MessagePage>(res);
}
