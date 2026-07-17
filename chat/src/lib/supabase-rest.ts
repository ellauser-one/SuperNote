/**
 * [INPUT]: 依赖 config/env（SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY）
 * [OUTPUT]: 对外提供 supabaseRest / createPostgrestQuery（纯 fetch，无 ORM）
 * [POS]: lib 集成层；chat/ 数据访问统一入口；禁止 supabase-js / pg 连接串
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 约定：
 * - 每个请求带 apikey + Authorization: Bearer service_role
 * - 应用层查询必须额外带 user_id 过滤（双保险，RLS 是第一道）
 * - returnRepresentation 时设置 Prefer: return=representation
 * - 非 2xx 抛 ChatDbError；204 返回 null
 * - 日志只记 method/path/status，不打印 content 正文
 */
import { env } from "@/config/env";

// ---------------------------------------------------------------------------
// 错误类型
// ---------------------------------------------------------------------------

/** chat 数据访问层错误；路由层捕获后转 JSON 信封 */
export class ChatDbError extends Error {
  readonly httpStatus: number;
  readonly code: string;

  constructor(httpStatus: number, code: string, message: string) {
    super(message);
    this.name = "ChatDbError";
    this.httpStatus = httpStatus;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export type RestMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type RestOptions = {
  method?: RestMethod;
  /** PostgREST 查询参数（由 PostgrestQueryBuilder 构造） */
  query?: Record<string, string>;
  /** 请求体（自动 JSON.stringify） */
  body?: unknown;
  /** 写入并需要回写行时设为 true → Prefer: return=representation */
  returnRepresentation?: boolean;
  /** 额外 header（勿覆盖 Authorization / apikey） */
  headers?: Record<string, string>;
  /** Upsert 冲突键（如 session_id,client_id） */
  onConflict?: string;
};

// ---------------------------------------------------------------------------
// supabaseRest — chat/ 数据访问唯一入口
// ---------------------------------------------------------------------------

/**
 * 统一 Supabase PostgREST 请求（service_role）。
 * 应用层每次查询必须强制带 user_id（双保险）。
 */
export async function supabaseRest<T = unknown>(
  path: string,
  options: RestOptions = {},
): Promise<T | null> {
  const method = options.method ?? "GET";
  const base = env.SUPABASE_URL.replace(/\/$/, "");
  const clean = path.replace(/^\//, "");
  const url = new URL(`${base}/rest/v1/${clean}`);

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };

  if (options.returnRepresentation) {
    headers.Prefer = "return=representation";
  }
  if (options.onConflict) {
    headers.Prefer = headers.Prefer
      ? `${headers.Prefer},resolution=merge-duplicates`
      : "resolution=merge-duplicates";
    url.searchParams.set("on_conflict", options.onConflict);
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "network error";
    console.error("[chat/db] fetch failed", method, path);
    throw new ChatDbError(502, "SUPABASE_REST_ERROR", `Supabase REST network error: ${msg}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const message = extractPostgrestMessage(text) || `Supabase REST ${res.status}`;
    console.error("[chat/db]", method, path, res.status);
    throw new ChatDbError(502, "SUPABASE_REST_ERROR", message);
  }

  if (res.status === 204) return null;

  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

// ---------------------------------------------------------------------------
// PostgrestQueryBuilder — 查询串构造器
// ---------------------------------------------------------------------------

/**
 * PostgREST 查询参数构造器。
 *
 * 用法：
 *   const q = createPostgrestQuery()
 *     .eq("user_id", userId)
 *     .is("deleted_at", "null")
 *     .order("updated_at", false)
 *     .limit(20)
 *     .build();
 */
export class PostgrestQueryBuilder {
  private params: Record<string, string> = {};

  select(columns: string): this {
    this.params.select = columns;
    return this;
  }

  eq(column: string, value: string | number | boolean): this {
    this.params[column] = `eq.${value}`;
    return this;
  }

  neq(column: string, value: string | number | boolean): this {
    this.params[column] = `neq.${value}`;
    return this;
  }

  /** PostgREST is.* 过滤器 */
  is(column: string, value: "null" | "true" | "false"): this {
    this.params[column] = `is.${value}`;
    return this;
  }

  /** 排序；可链式多次调用（order=a.asc,b.desc） */
  order(column: string, ascending = true): this {
    const part = `${column}.${ascending ? "asc" : "desc"}`;
    this.params.order = this.params.order
      ? `${this.params.order},${part}`
      : part;
    return this;
  }

  limit(n: number): this {
    this.params.limit = String(n);
    return this;
  }

  offset(n: number): this {
    this.params.offset = String(n);
    return this;
  }

  /** PostgREST lt.* 过滤器（游标分页用） */
  lt(column: string, value: string): this {
    this.params[column] = `lt.${value}`;
    return this;
  }

  build(): Record<string, string> {
    return { ...this.params };
  }
}

export function createPostgrestQuery(): PostgrestQueryBuilder {
  return new PostgrestQueryBuilder();
}

// ---------------------------------------------------------------------------
// 内部工具
// ---------------------------------------------------------------------------

function extractPostgrestMessage(body: unknown): string | null {
  if (!body) return null;
  if (typeof body === "string") {
    const trimmed = body.trim();
    if (!trimmed) return null;
    try {
      return extractPostgrestMessage(JSON.parse(trimmed));
    } catch {
      return trimmed;
    }
  }
  if (typeof body === "object") {
    const rec = body as Record<string, unknown>;
    if (typeof rec.message === "string" && rec.message.trim()) return rec.message.trim();
    if (typeof rec.error === "string" && rec.error.trim()) return rec.error.trim();
    if (typeof rec.msg === "string" && rec.msg.trim()) return rec.msg.trim();
  }
  return null;
}
