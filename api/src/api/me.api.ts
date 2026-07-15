/**
 * [INPUT]: 依赖 Hono、requireAuth、service/me
 * [OUTPUT]: 对外提供 GET /v1/me（当前 JWT 用户 + profile 摘要）
 * [POS]: api HTTP 层；证明 JWT 校验与 claims.user_id 已就绪
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Hono } from "hono";

import type { AuthVariables } from "../common/auth-context";
import { ok } from "../common/response";
import { requireAuth } from "../middleware/auth";
import { getMe } from "../service/me.service";

export const meApi = new Hono<{ Variables: AuthVariables }>();

meApi.use("*", requireAuth);

meApi.get("/", async (c) => {
  const auth = c.get("auth");
  const me = await getMe({
    userId: auth.userId,
    email: auth.email,
  });
  return ok(c, me);
});
