/**
 * [INPUT]: 依赖 config/env（SUPABASE_URL + SERVICE_ROLE_KEY）、common/app-error
 * [OUTPUT]: 对外提供 extractBearerToken / fetchAuthUser
 * [POS]: lib 集成层；经 Auth REST 校验用户 JWT，不打印 Authorization
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 约定：
 * - 仅信任 ${SUPABASE_URL}/auth/v1/user 返回的用户
 * - user id 只能来自 JWT，禁止来自 body
 * - 日志只记录 status，不打印 token / Authorization header
 */
import { HttpError } from "../common/app-error";
import { env } from "../config/env";
import type { AuthUser } from "../model/profile.model";

/**
 * 从 Authorization 头提取 Bearer token。
 * 缺失或格式错误 → HttpError 401。
 */
export function extractBearerToken(
  authorizationHeader: string | undefined | null,
): string {
  if (!authorizationHeader || typeof authorizationHeader !== "string") {
    throw new HttpError(401, "UNAUTHORIZED", "缺少 Authorization 头");
  }

  const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader.trim());
  if (!match?.[1]) {
    throw new HttpError(401, "UNAUTHORIZED", "Authorization 必须为 Bearer <token>");
  }

  return match[1];
}

/**
 * 用用户 JWT 调 Supabase Auth `/auth/v1/user`，得到可信 AuthUser。
 * 非法 / 过期 JWT → 401。
 */
export async function fetchAuthUser(accessToken: string): Promise<AuthUser> {
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
    console.error("[supabase-auth] fetch user failed");
    throw new HttpError(
      502,
      "SUPABASE_AUTH_ERROR",
      `Supabase Auth network error: ${msg}`,
    );
  }

  if (res.status === 401 || res.status === 403) {
    console.error("[supabase-auth] user invalid", res.status);
    throw new HttpError(401, "UNAUTHORIZED", "无效或过期的访问令牌");
  }

  if (!res.ok) {
    console.error("[supabase-auth] user error", res.status);
    throw new HttpError(
      502,
      "SUPABASE_AUTH_ERROR",
      `Supabase Auth 返回 ${res.status}`,
    );
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new HttpError(502, "SUPABASE_AUTH_ERROR", "Supabase Auth 响应无法解析");
  }

  const user = normalizeAuthUser(body);
  if (!user) {
    throw new HttpError(401, "UNAUTHORIZED", "无法从令牌解析用户");
  }

  return user;
}

function normalizeAuthUser(body: unknown): AuthUser | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const rec = body as Record<string, unknown>;
  // 兼容 { user: {...} } 与直接 user 对象
  const raw =
    rec.user && typeof rec.user === "object"
      ? (rec.user as Record<string, unknown>)
      : rec;

  const id = raw.id;
  if (typeof id !== "string" || !id) {
    return null;
  }

  const email = typeof raw.email === "string" ? raw.email : null;
  const user_metadata =
    raw.user_metadata && typeof raw.user_metadata === "object"
      ? (raw.user_metadata as Record<string, unknown>)
      : {};
  const app_metadata =
    raw.app_metadata && typeof raw.app_metadata === "object"
      ? (raw.app_metadata as Record<string, unknown>)
      : {};

  return { id, email, user_metadata, app_metadata };
}
