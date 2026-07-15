/**
 * [INPUT]: 依赖 config/env、common/user-context、Hono
 * [OUTPUT]: 对外提供 requireTrustedUser 中间件
 * [POS]: middleware 入口；只接受 api 转发的服务令牌 + X-User-Id
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 协议头：
 * - X-Service-Token: 与 api 共享的 INTERNAL_SERVICE_TOKEN
 * - X-User-Id: 已验签 JWT 的 claims.sub
 * - X-User-Email: 可选
 */
import type { MiddlewareHandler } from "hono";

import type { UserContextVariables } from "../common/user-context";
import { assertInternalServiceToken, env } from "../config/env";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const requireTrustedUser: MiddlewareHandler<{
  Variables: UserContextVariables;
}> = async (c, next) => {
  try {
    assertInternalServiceToken();
  } catch (err) {
    console.error("[chat]", err);
    return c.json({ error: "Chat service misconfigured" }, 500);
  }

  const token = c.req.header("X-Service-Token")?.trim() ?? "";
  if (!token || token !== env.internalServiceToken) {
    return c.json({ error: "Invalid or missing X-Service-Token" }, 401);
  }

  const userId = c.req.header("X-User-Id")?.trim() ?? "";
  if (!userId || !UUID_RE.test(userId)) {
    return c.json({ error: "Invalid or missing X-User-Id" }, 400);
  }

  const emailRaw = c.req.header("X-User-Email")?.trim();
  const email = emailRaw && emailRaw.length > 0 ? emailRaw : null;

  c.set("user", { userId, email });
  await next();
};
