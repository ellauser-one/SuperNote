/**
 * [INPUT]: 依赖 config/env（SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY）
 * [OUTPUT]: 对外提供 supabaseRest / supabaseAuthGetUser（纯 fetch，无 ORM）
 * [POS]: lib 集成层；repository 只经由此访问 PostgREST；CRUD 禁止 @supabase/supabase-js
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { assertSupabaseAdminEnv, env } from "../config/env";
import { AppError } from "../common/app-error";
import { ApiCode } from "../model/response.model";

export type SupabaseRestMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "HEAD";

export type SupabaseRestOptions = {
  method?: SupabaseRestMethod;
  /** PostgREST query：select / id=eq.x / order / limit 等 */
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /**
   * Prefer 头。写入并需要回写行时用 return=representation；
   * upsert 可用 resolution=merge-duplicates,return=representation
   */
  prefer?: string;
  /** 额外 header（勿覆盖 Authorization / apikey，除非明确需要） */
  headers?: Record<string, string>;
};

export type SupabaseRestResult<T> = {
  data: T;
  status: number;
  headers: Headers;
};

export class SupabaseRestError extends AppError {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    const code =
      status >= 400 && status < 600 ? status : ApiCode.BAD_GATEWAY;
    super(code, message, status >= 400 && status < 600 ? status : 502);
    this.name = "SupabaseRestError";
    this.status = status;
    this.details = details;
  }
}

function buildRestUrl(
  path: string,
  query?: SupabaseRestOptions["query"],
): URL {
  const base = env.supabaseUrl.replace(/\/$/, "");
  const clean = path.replace(/^\//, "");
  const url = new URL(`${base}/rest/v1/${clean}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  return url;
}

/**
 * 统一 Supabase PostgREST 请求。
 * 每个请求带 apikey + Authorization: Bearer service_role。
 * 日志只记录 method/path/status，不打印 token。
 */
export async function supabaseRest<T = unknown>(
  path: string,
  options: SupabaseRestOptions = {},
): Promise<SupabaseRestResult<T>> {
  assertSupabaseAdminEnv();

  const method = options.method ?? "GET";
  const url = buildRestUrl(path, options.query);

  const headers: Record<string, string> = {
    apikey: env.supabaseServiceRoleKey,
    Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };

  if (options.prefer) {
    headers.Prefer = options.prefer;
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
    throw new SupabaseRestError(`Supabase REST network error: ${msg}`, 502);
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const message = extractPostgrestMessage(parsed) || `Supabase REST ${res.status}`;
    console.error("[supabase-rest]", method, path, res.status);
    throw new SupabaseRestError(message, res.status, parsed);
  }

  return {
    data: parsed as T,
    status: res.status,
    headers: res.headers,
  };
}

function extractPostgrestMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return typeof body === "string" && body.trim() ? body.trim() : null;
  }
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
  return null;
}

/** Auth 用户对象（/auth/v1/user 子集） */
export type SupabaseAuthUser = {
  id: string;
  email?: string | null;
};

/**
 * 用用户 access_token 校验 Supabase JWT（Auth REST，非 PostgREST CRUD）。
 * apikey 使用 service_role（仅服务端）；Authorization 为用户 JWT。
 */
export async function supabaseAuthGetUser(
  accessToken: string,
): Promise<SupabaseAuthUser> {
  assertSupabaseAdminEnv();

  const base = env.supabaseUrl.replace(/\/$/, "");
  const url = `${base}/auth/v1/user`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: env.supabaseServiceRoleKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "network error";
    console.error("[supabase-auth] fetch failed");
    throw new SupabaseRestError(`Supabase Auth network error: ${msg}`, 502);
  }

  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    email?: string | null;
    msg?: string;
    message?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !body.id) {
    const message =
      body.msg ||
      body.message ||
      body.error_description ||
      body.error ||
      "Invalid or expired access token";
    console.error("[supabase-auth] verify failed", res.status);
    throw new SupabaseRestError(message, res.status === 401 ? 401 : 401);
  }

  return {
    id: body.id,
    email: body.email ?? null,
  };
}
