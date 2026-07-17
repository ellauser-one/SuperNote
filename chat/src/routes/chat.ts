/**
 * [INPUT]: 依赖 @mastra/core/server、@mastra/ai-sdk handleChatStream、ai createUIMessageStreamResponse、authMiddleware、env
 * [OUTPUT]: 对外提供 chatRoute — POST /v1/chat（SSE UI message stream）
 * [POS]: routes 层；由 mastra/index server.apiRoutes 挂载
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 关键：maxSteps 必须显式传入，否则 AI SDK 默认 5 步会腰斩长任务。
 */
import { handleChatStream } from "@mastra/ai-sdk";
import { registerApiRoute } from "@mastra/core/server";
import { createUIMessageStreamResponse } from "ai";

import { env } from "@/config/env";
import { authMiddleware } from "@/middleware/auth";

export const chatRoute = registerApiRoute("/v1/chat", {
  method: "POST",
  // Mastra 内嵌 hono 与顶层 hono 类型不完全兼容，此处做窄化断言
  middleware: [authMiddleware as never],
  handler: async (c) => {
    const mastra = c.get("mastra");
    const params = await c.req.json();

    // ai@7 对齐 AI SDK v6 流契约；maxSteps 必须显式传（默认 5 会腰斩）
    const stream = await handleChatStream({
      mastra,
      agentId: "memo-agent",
      version: "v6",
      params: {
        ...params,
        maxSteps: env.MAX_STEPS,
      },
    });

    return createUIMessageStreamResponse({ stream });
  },
});
