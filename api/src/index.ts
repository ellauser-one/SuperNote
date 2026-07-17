/**
 * [INPUT]: 依赖 app、config/env、lib/banner
 * [OUTPUT]: 进程入口（Bun.serve）
 * [POS]: src 根入口；启动顺序 printBanner → printRuntimeInfo → Bun.serve → printReady
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { app } from "./app";
import { env } from "./config/env";
import {
  printBanner,
  printReady,
  printRuntimeInfo,
  runtimeInfoFromEnv,
} from "./lib/banner";

// 1) ASCII 横幅
printBanner(env.systemName);

// 2) 运行时信息（不含密钥）
printRuntimeInfo(runtimeInfoFromEnv());

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
  mainRoutes: [
    "/health",
    "/profile",
    "/memo-tree",
    "/memo-folders",
    "/memos",
    "/memo-nodes/:nodeId",
  ],
});
