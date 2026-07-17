/**
 * [INPUT]: 依赖 @mastra/core、memoAgent、chatRoute、config/env
 * [OUTPUT]: 对外 export mastra 实例（agents + server）；mastra CLI 入口
 * [POS]: mastra 装配根；agents 字典 key = 'memo-agent'；apiRoutes 挂 /v1/chat
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Mastra } from "@mastra/core";

import { env } from "@/config/env";
import { chatRoute } from "@/routes/chat";

import { memoAgent } from "./agents/memo-agent";

export const mastra = new Mastra({
  agents: {
    "memo-agent": memoAgent,
  },
  server: {
    port: env.PORT,
    cors: {
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    },
    apiRoutes: [chatRoute],
  },
});
