/**
 * [INPUT]: 依赖 Hono MiddlewareHandler
 * [OUTPUT]: 对外提供 requestLogger 中间件
 * [POS]: middleware 请求日志；记录 ISO 时间 / method / path / status / duration / origin
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 安全：禁止打印 token / service role key / 完整 Authorization header。
 */
import type { MiddlewareHandler } from "hono";

export function requestLogger(): MiddlewareHandler {
  return async (c, next) => {
    const start = Date.now();
    const { method } = c.req;
    const path = c.req.path;
    const origin = c.req.header("origin") || "-";

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;
    const iso = new Date().toISOString();

    // [request] 2026-07-16T12:00:00.000Z GET /health 200 1ms origin=-
    console.log(
      `[request] ${iso} ${method} ${path} ${status} ${duration}ms origin=${origin}`,
    );
  };
}
