/**
 * [INPUT]: 依赖 lib/supabase-rest、model/memo.model、common/app-error
 * [OUTPUT]: 对外提供 memo_nodes / memos REST CRUD
 * [POS]: repository 层；只走 supabase-rest，无业务权限
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 约定：
 * - 所有查询带 user_id 过滤（service_role 绕过 RLS，由 service 保证传入 JWT id）
 * - Prefer: return=representation 返回写入后的行
 * - 禁止 supabase-js 客户端 / 连接串
 */
import { HttpError } from "../common/app-error";
import {
  createPostgrestQuery,
  supabaseRest,
} from "../lib/supabase-rest";
import type { MemoContent, MemoNode } from "../model/memo.model";

const NODES = "memo_nodes";
const MEMOS = "memos";

// ---------------------------------------------------------------------------
// 归一化：PostgREST 可能把 numeric 返回为 number
// ---------------------------------------------------------------------------

function normalizeNode(row: Record<string, unknown>): MemoNode {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    parent_id: row.parent_id == null ? null : String(row.parent_id),
    node_type: row.node_type as MemoNode["node_type"],
    title: String(row.title),
    sort_order: String(row.sort_order),
    icon: row.icon == null ? null : String(row.icon),
    color: row.color == null ? null : String(row.color),
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
    deleted_at: row.deleted_at == null ? null : String(row.deleted_at),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function normalizeMemo(row: Record<string, unknown>): MemoContent {
  return {
    node_id: String(row.node_id),
    user_id: String(row.user_id),
    content_mdx: typeof row.content_mdx === "string" ? row.content_mdx : "",
    excerpt: row.excerpt == null ? null : String(row.excerpt),
    word_count: Number(row.word_count ?? 0),
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

// ---------------------------------------------------------------------------
// memo_nodes
// ---------------------------------------------------------------------------

/** 当前用户全部未删除节点（扁平） */
export async function listActiveNodesByUser(
  userId: string,
): Promise<MemoNode[]> {
  const query = createPostgrestQuery()
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", "null")
    .order("sort_order", true)
    .order("id", true)
    .build();

  const rows = await supabaseRest<Record<string, unknown>[]>(NODES, {
    method: "GET",
    query,
  });

  return (rows ?? []).map(normalizeNode);
}

export async function findNodeByIdForUser(
  userId: string,
  nodeId: string,
): Promise<MemoNode | null> {
  const query = createPostgrestQuery()
    .select("*")
    .eq("user_id", userId)
    .eq("id", nodeId)
    .limit(1)
    .build();

  const rows = await supabaseRest<Record<string, unknown>[]>(NODES, {
    method: "GET",
    query,
  });

  if (!rows || rows.length === 0) return null;
  return normalizeNode(rows[0]!);
}

/** 同级最大 sort_order；无兄弟返回 null */
export async function findMaxSortOrder(
  userId: string,
  parentId: string | null,
): Promise<number | null> {
  const builder = createPostgrestQuery()
    .select("sort_order")
    .eq("user_id", userId)
    .is("deleted_at", "null")
    .order("sort_order", false)
    .limit(1);

  const query =
    parentId == null
      ? builder.is("parent_id", "null").build()
      : builder.eq("parent_id", parentId).build();

  const rows = await supabaseRest<Array<{ sort_order: string | number }>>(
    NODES,
    { method: "GET", query },
  );

  if (!rows || rows.length === 0) return null;
  const raw = rows[0]!.sort_order;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function insertNode(row: {
  user_id: string;
  parent_id: string | null;
  node_type: "folder" | "memo";
  title: string;
  sort_order: number | string;
  icon?: string | null;
  color?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<MemoNode> {
  const created = await supabaseRest<Record<string, unknown>[]>(NODES, {
    method: "POST",
    body: {
      user_id: row.user_id,
      parent_id: row.parent_id,
      node_type: row.node_type,
      title: row.title,
      sort_order: row.sort_order,
      icon: row.icon ?? null,
      color: row.color ?? null,
      metadata: row.metadata ?? {},
    },
    returnRepresentation: true,
  });

  const first = Array.isArray(created) ? created[0] : null;
  if (!first) {
    throw new HttpError(502, "SUPABASE_REST_ERROR", "创建 memo_node 后未返回行");
  }
  return normalizeNode(first);
}

export async function updateNodeForUser(
  userId: string,
  nodeId: string,
  patch: Partial<{
    title: string;
    parent_id: string | null;
    sort_order: number | string;
    icon: string | null;
    color: string | null;
    metadata: Record<string, unknown>;
    deleted_at: string | null;
  }>,
): Promise<MemoNode> {
  const query = createPostgrestQuery()
    .eq("user_id", userId)
    .eq("id", nodeId)
    .build();

  const updated = await supabaseRest<Record<string, unknown>[]>(NODES, {
    method: "PATCH",
    query: { ...query, select: "*" },
    body: patch,
    returnRepresentation: true,
  });

  const first = Array.isArray(updated) ? updated[0] : null;
  if (!first) {
    throw new HttpError(404, "NOT_FOUND", "节点不存在");
  }
  return normalizeNode(first);
}

// ---------------------------------------------------------------------------
// memos
// ---------------------------------------------------------------------------

export async function listMemosByUser(userId: string): Promise<MemoContent[]> {
  const query = createPostgrestQuery()
    .select("*")
    .eq("user_id", userId)
    .build();

  const rows = await supabaseRest<Record<string, unknown>[]>(MEMOS, {
    method: "GET",
    query,
  });

  return (rows ?? []).map(normalizeMemo);
}

export async function findMemoByNodeIdForUser(
  userId: string,
  nodeId: string,
): Promise<MemoContent | null> {
  const query = createPostgrestQuery()
    .select("*")
    .eq("user_id", userId)
    .eq("node_id", nodeId)
    .limit(1)
    .build();

  const rows = await supabaseRest<Record<string, unknown>[]>(MEMOS, {
    method: "GET",
    query,
  });

  if (!rows || rows.length === 0) return null;
  return normalizeMemo(rows[0]!);
}

/**
 * 按 nodeId + user_id 取 memo 的标题与正文（双表 owner 校验）。
 * 节点或正文缺失 → 404。
 */
export async function getMemoByIdForUser(
  userId: string,
  nodeId: string,
): Promise<{ title: string; content: string }> {
  const nodeQuery = createPostgrestQuery()
    .select("id,title")
    .eq("user_id", userId)
    .eq("id", nodeId)
    .limit(1)
    .build();

  const nodes = await supabaseRest<Record<string, unknown>[]>(NODES, {
    method: "GET",
    query: nodeQuery,
  });

  if (!nodes || nodes.length === 0) {
    throw new HttpError(404, "NOT_FOUND", "备忘录不存在");
  }
  const title = String(nodes[0]!.title);

  const memoQuery = createPostgrestQuery()
    .select("content_mdx")
    .eq("user_id", userId)
    .eq("node_id", nodeId)
    .limit(1)
    .build();

  const memos = await supabaseRest<Record<string, unknown>[]>(MEMOS, {
    method: "GET",
    query: memoQuery,
  });

  if (!memos || memos.length === 0) {
    throw new HttpError(404, "NOT_FOUND", "备忘录正文不存在");
  }
  const contentMdx = memos[0]!.content_mdx;
  const content = typeof contentMdx === "string" ? contentMdx : "";

  return { title, content };
}

/** PATCH memos.category（owner 校验由 user_id 过滤保证） */
export async function updateMemoCategory(
  userId: string,
  nodeId: string,
  category: string,
): Promise<{ node_id: string; category: string }> {
  const query = createPostgrestQuery()
    .eq("user_id", userId)
    .eq("node_id", nodeId)
    .build();

  const updated = await supabaseRest<Record<string, unknown>[]>(MEMOS, {
    method: "PATCH",
    query: { ...query, select: "node_id,category" },
    body: { category },
    returnRepresentation: true,
  });

  const first = Array.isArray(updated) ? updated[0] : null;
  if (!first) {
    throw new HttpError(404, "NOT_FOUND", "备忘录正文不存在");
  }
  return {
    node_id: String(first.node_id),
    category: first.category == null ? "" : String(first.category),
  };
}

export async function insertMemo(row: {
  node_id: string;
  user_id: string;
  content_mdx?: string;
  excerpt?: string | null;
  word_count?: number;
  metadata?: Record<string, unknown>;
}): Promise<MemoContent> {
  const created = await supabaseRest<Record<string, unknown>[]>(MEMOS, {
    method: "POST",
    body: {
      node_id: row.node_id,
      user_id: row.user_id,
      content_mdx: row.content_mdx ?? "",
      excerpt: row.excerpt ?? null,
      word_count: row.word_count ?? 0,
      metadata: row.metadata ?? {},
    },
    returnRepresentation: true,
  });

  const first = Array.isArray(created) ? created[0] : null;
  if (!first) {
    throw new HttpError(502, "SUPABASE_REST_ERROR", "创建 memo 正文后未返回行");
  }
  return normalizeMemo(first);
}

export async function updateMemoForUser(
  userId: string,
  nodeId: string,
  patch: Partial<{
    content_mdx: string;
    excerpt: string | null;
    word_count: number;
    metadata: Record<string, unknown>;
  }>,
): Promise<MemoContent> {
  const query = createPostgrestQuery()
    .eq("user_id", userId)
    .eq("node_id", nodeId)
    .build();

  const updated = await supabaseRest<Record<string, unknown>[]>(MEMOS, {
    method: "PATCH",
    query: { ...query, select: "*" },
    body: patch,
    returnRepresentation: true,
  });

  const first = Array.isArray(updated) ? updated[0] : null;
  if (!first) {
    throw new HttpError(404, "NOT_FOUND", "备忘录正文不存在");
  }
  return normalizeMemo(first);
}
