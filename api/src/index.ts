/**
 * [INPUT]: 依赖 Hono、cors、router、config/env、banner、response 信封
 * [OUTPUT]: 对外提供 api 进程入口（Bun.serve）
 * [POS]: src 根入口；启动顺序 banner → runtime → serve → ready
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Hono } from "hono";
import { cors } from "hono/cors";

import { AppError } from "./common/app-error";
import type { AuthVariables } from "./common/auth-context";
import { fail } from "./common/response";
import { env } from "./config/env";
import {
  detectEnvName,
  detectRuntime,
  printBanner,
  printReady,
  printRuntimeInfo,
  resolveSystemName,
  supabaseHostFromUrl,
} from "./lib/banner";
import { AuthError } from "./middleware/auth";
import { ApiCode } from "./model/response.model";
import { router } from "./router";

const systemName = env.appName || resolveSystemName();

// 1) ASCII 横幅
printBanner(systemName);

// 2) 运行时信息（不含密钥）
printRuntimeInfo({
  systemName,
  envName: detectEnvName(),
  runtime: detectRuntime(),
  port: env.port,
  supabaseHost: supabaseHostFromUrl(env.supabaseUrl),
  corsOrigins: env.corsOrigins,
});

const app = new Hono<{ Variables: AuthVariables }>();

app.use(
  "*",
  cors({
    origin: env.corsOrigins,
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.route("/", router);

app.onError((err, c) => {
  // 不打印 token / Authorization / service role
  if (err instanceof AuthError) {
    return fail(c, ApiCode.UNAUTHORIZED, err.message, err.status);
  }
  if (err instanceof AppError) {
    console.error("[api]", err.name, err.code, err.message);
    const status = err.httpStatus;
    if (
      status === 400 ||
      status === 401 ||
      status === 403 ||
      status === 404 ||
      status === 409 ||
      status === 422 ||
      status === 502
    ) {
      return fail(c, err.code, err.message, status);
    }
    return fail(c, err.code, err.message, 500);
  }
  console.error("[api]", err instanceof Error ? err.message : "unknown error");
  return fail(c, ApiCode.INTERNAL, "Internal Server Error", 500);
});

// 3) 启动 HTTP 服务
const server = Bun.serve({
  port: env.port,
  fetch: app.fetch,
});

// 4) 就绪信息
const baseUrl = `http://localhost:${server.port}`;
printReady({
  baseUrl,
  healthPath: "/health",
  mainRoutes: ["/v1/me", "/v1/profiles", "/v1/ai"],
});
