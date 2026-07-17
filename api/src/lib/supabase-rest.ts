/**
 * [INPUT]: 依赖 config/env（SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY）、common/app-error
 * [OUTPUT]: 对外提供 supabaseRest / createPostgrestQuery（纯 fetch，无 ORM）
 * [POS]: lib 集成层；repository 只经由此访问 PostgREST；CRUD 禁止 supabase-js 客户端
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 约定：
 * - 每个请求带 apikey + Authorization: Bearer service_role
 * - returnRepresentation 时设置 Prefer: return=representation
 * - 非 2xx 抛 HttpError(502, "SUPABASE_REST_ERROR", ...)
 * - 204 返回 null
 * - 日志只记录 method/path/status，不打印 token
 */
import { HttpError } from "../common/app-error";
import { env } from "../config/env";

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export type SupabaseRestMethod =
  | "GET"
  | "POST"
  | "PATCH"
  | "PUT"
  | "DELETE";

export type SupabaseRestOptions = {
  method?: SupabaseRestMethod;
  /** PostgREST 查询参数（由 createPostgrestQuery 构造） */
  query?: Record<string, string>;
  /** 请求体（自动 JSON.stringify） */
  body?: unknown;
  /** 写入并需要回写行时设为 true → Prefer: return=representation */
  returnRepresentation?: boolean;
  /** 额外 header（勿覆盖 Authorization / apikey） */
  headers?: Record<string, string>;
};

// ---------------------------------------------------------------------------
// supabaseRest — 单一入口
// ---------------------------------------------------------------------------

/**
 * 统一 Supabase PostgREST 请求。
 *
 * @param path  表名或路径，如 "profiles" 或 "profiles?id=eq.xxx"
 *              （query 参数建议用 options.query 传入）
 * @param options  method / query / body / returnRepresentation / headers
 * @returns 解析后的 JSON；204 或空 body 返回 null
 */
export async function supabaseRest<T = unknown>(
  path: string,
  options: SupabaseRestOptions = {},
): Promise<T | null> {
  const method = options.method ?? "GET";
  const base = env.supabaseUrl.replace(/\/$/, "");
  const clean = path.replace(/^\//, "");
  const url = new URL(`${base}/rest/v1/${clean}`);

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    apikey: env.supabaseServiceRoleKey,
    Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };

  if (options.returnRepresentation) {
    headers.Prefer = "return=representation";
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
    console.error("[supabase-rest] fetch failed", method, path);
    throw new HttpError(502, "SUPABASE_REST_ERROR", `Supabase REST network error: ${msg}`);
  }

  // 非 2xx → HttpError(502, ...)
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const message = extractPostgrestMessage(text) || `Supabase REST ${res.status}`;
    console.error("[supabase-rest]", method, path, res.status);
    throw new HttpError(502, "SUPABASE_REST_ERROR", message);
  }

  // 204 No Content
  if (res.status === 204) {
    return null;
  }

  const text = await res.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

// ---------------------------------------------------------------------------
// createPostgrestQuery — 查询串构造器
// ---------------------------------------------------------------------------

/**
 * PostgREST 查询参数构造器。
 *
 * 用法：
 *   const q = createPostgrestQuery()
 *     .select("id,name")
 *     .eq("user_id", userId)
 *     .order("created_at", false)
 *     .limit(10)
 *     .build();
 *   const rows = await supabaseRest<Row[]>("profiles", { query: q });
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

  /** PostgREST is.* 过滤器，如 is("deleted_at", "null") */
  is(column: string, value: "null" | "true" | "false"): this {
    this.params[column] = `is.${value}`;
    return this;
  }

  /**
   * 排序。可链式多次调用以追加列（order=a.asc,b.desc）。
   */
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

  // 响应体常为 JSON 字符串
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
    if (typeof rec.message === "string" && rec.message.trim()) {
      return rec.message.trim();
    }
    if (typeof rec.error === "string" && rec.error.trim()) {
      return rec.error.trim();
    }
    if (typeof rec.msg === "string" && rec.msg.trim()) {
      return rec.msg.trim();
    }
  }
  return null;
}
