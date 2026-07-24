/**
 * [INPUT]: 依赖 Hono、cors、router、middleware（requestLogger / errorHandler）、config/env
 * [OUTPUT]: 对外提供 app（组装完成的 Hono 实例）
 * [POS]: app 层；只负责组装 Hono，不含业务逻辑
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 组装顺序：
 * 1. requestLogger  — 请求日志
 * 2. cors           — CORS 中间件
 * 3. router         — 路由聚合
 * 4. onError        — 错误处理（注册在最后，捕获全局错误）
 */
import { Hono } from "hono";
import { cors } from "hono/cors";

import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { requestLogger } from "./middleware/request-logger";
import { router } from "./router";

export const app = new Hono();

// 1) 请求日志
app.use("*", requestLogger());

// 2) CORS
// 非 production 使用通配 *（dev 便利）；production 严格使用白名单。
// 鉴权走 Bearer，不开启 credentials。
const corsOrigin = env.nodeEnv === "production" ? env.corsOrigins : "*";
app.use(
  "*",
  cors({
    origin: corsOrigin,
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

// 3) 路由聚合
app.route("/", router);

// 4) 错误处理
app.onError(errorHandler);
