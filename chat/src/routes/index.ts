/**
 * [INPUT]: 依赖 Hono 与子路由
 * [OUTPUT]: 对外提供 chat 根路由聚合
 * [POS]: routes 聚合层；index.ts 只挂载本模块
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Hono } from "hono";

import type { UserContextVariables } from "../common/user-context";
import { generateRoute } from "./generate";

export const routes = new Hono<{ Variables: UserContextVariables }>();

routes.get("/health", (c) => c.json({ ok: true, service: "chat" }));
routes.route("/v1/generate", generateRoute);
