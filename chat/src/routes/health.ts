/**
 * [INPUT]: 依赖 @mastra/core/server registerApiRoute、config/env
 * [OUTPUT]: 对外提供 healthRoute — GET /health（发布探针）
 * [POS]: routes 层；由 mastra/index server.apiRoutes 挂载；统一 JSON 信封 { code, message, data }
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 探针只暴露健康状态与模型是否配置（布尔），绝不暴露任何 key。
 */
import { registerApiRoute } from "@mastra/core/server";

import { env } from "@/config/env";

export const healthRoute = registerApiRoute("/health", {
  method: "GET",
  handler: async () => {
    return Response.json({
      code: "ok",
      message: "OK",
      data: {
        status: "healthy",
        // 只暴露布尔，绝不暴露 key 本身
        modelConfigured: Boolean(env.DEEPSEEK_API_KEY),
        defaultModel: env.DEFAULT_MODEL,
      },
    });
  },
});
