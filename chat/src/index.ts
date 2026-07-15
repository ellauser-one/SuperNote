/**
 * [INPUT]: 依赖 Hono、routes、config/env
 * [OUTPUT]: 对外提供 chat 进程入口（Bun.serve）
 * [POS]: src 根入口；只接受 api 下发的可信 user context，不直接对浏览器验 JWT
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Hono } from "hono";

import type { UserContextVariables } from "./common/user-context";
import { env } from "./config/env";
import { routes } from "./routes";

const app = new Hono<{ Variables: UserContextVariables }>();

app.route("/", routes);

app.onError((err, c) => {
  console.error("[chat]", err);
  return c.json({ error: err.message || "Internal Server Error" }, 500);
});

console.log(`[chat] listening on http://localhost:${env.port}`);

export default {
  port: env.port,
  fetch: app.fetch,
};
