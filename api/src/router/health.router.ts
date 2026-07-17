/**
 * [INPUT]: 依赖 Hono、common/response（ok）
 * [OUTPUT]: 对外提供 healthRouter
 * [POS]: router 健康检查；GET /health 返回统一信封
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Hono } from "hono";

import { ok } from "../common/response";

export const healthRouter = new Hono();

healthRouter.get("/health", (c) =>
  ok(c, { status: "healthy" }, "OK"),
);
