/**
 * [INPUT]: 依赖 lib/supabase-rest Auth REST、common/auth-context、Hono
 * [OUTPUT]: 对外提供 requireAuth 中间件（Bearer JWT → AuthContext）
 * [POS]: middleware 鉴权入口；受保护路由必须挂载此中间件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 用户身份只来自 Authorization: Bearer <Supabase JWT>，禁止信任 body.user_id。
 */
import type { MiddlewareHandler } from "hono";

import type { AuthContext, AuthVariables } from "../common/auth-context";
import { fail } from "../common/response";
import { supabaseAuthGetUser, SupabaseRestError } from "../lib/supabase-rest";
import { ApiCode } from "../model/response.model";

export class AuthError extends Error {
  readonly status: 401 | 403;

  constructor(message: string, status: 401 | 403 = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

function extractBearer(header: string | undefined): string | null {
  if (!header) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token || null;
}

/**
 * 校验 Supabase access_token，从 Auth REST 得到 user_id。
 * 走服务端 /auth/v1/user（含签名与失效校验），勿只 decode 不验签。
 */
export async function verifyAccessToken(accessToken: string): Promise<AuthContext> {
  try {
    const user = await supabaseAuthGetUser(accessToken);
    return {
      userId: user.id,
      email: user.email ?? null,
      accessToken,
    };
  } catch (err) {
    if (err instanceof SupabaseRestError) {
      throw new AuthError(err.message, 401);
    }
    const message = err instanceof Error ? err.message : "Unauthorized";
    throw new AuthError(message, 401);
  }
}

/**
 * 要求 `Authorization: Bearer <access_token>`。
 * 成功后写入 `c.get('auth')` → `{ userId, email, accessToken }`。
 */
export const requireAuth: MiddlewareHandler<{ Variables: AuthVariables }> = async (
  c,
  next,
) => {
  const token = extractBearer(c.req.header("Authorization"));
  if (!token) {
    return fail(
      c,
      ApiCode.UNAUTHORIZED,
      "Missing Authorization Bearer token",
      401,
    );
  }

  try {
    const auth = await verifyAccessToken(token);
    c.set("auth", auth);
    await next();
  } catch (err) {
    const message = err instanceof AuthError ? err.message : "Unauthorized";
    const status = err instanceof AuthError ? err.status : 401;
    return fail(c, ApiCode.UNAUTHORIZED, message, status);
  }
};
