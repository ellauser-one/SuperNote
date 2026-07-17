/**
 * [INPUT]: 依赖 @mastra/core/server registerApiRoute、authMiddleware、
 *          repository/chat.repository（listMessages）、ChatDbError
 * [OUTPUT]: 对外提供 sessionMessagesRoute — GET /v1/sessions/:id/messages
 * [POS]: routes 层；由 mastra/index server.apiRoutes 挂载；统一 JSON 信封
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 分页：before 游标 = base64url(JSON({ created_at, id }))；默认取最近 50 条
 */
import { registerApiRoute } from "@mastra/core/server";

import { authMiddleware } from "@/middleware/auth";
import { listMessages } from "@/repository/chat.repository";
import { ChatDbError } from "@/lib/supabase-rest";

/* -------------------------------------------------------------------------- */
/* 信封 helper                                                                 */
/* -------------------------------------------------------------------------- */

function okJson(data: unknown, message = "ok", status = 200) {
  return Response.json({ code: "ok", message, data }, { status });
}

function failJson(code: string, message: string, status: number) {
  return Response.json({ code, message, data: null }, { status });
}

/* -------------------------------------------------------------------------- */
/* GET /v1/sessions/:id/messages — 历史分页（before 游标）                       */
/* -------------------------------------------------------------------------- */

export const sessionMessagesRoute = registerApiRoute("/v1/sessions/:id/messages", {
  method: "GET",
  middleware: [authMiddleware as never],
  handler: async (c) => {
    const userId = c.get("userId" as never) as unknown as string;
    const sessionId = c.req.param("id");

    // 解析查询参数
    const url = new URL(c.req.url);
    const before = url.searchParams.get("before") ?? undefined;
    const limitStr = url.searchParams.get("limit");
    const limit = limitStr ? Math.min(Math.max(Number(limitStr) || 50, 1), 100) : 50;

    try {
      const result = await listMessages(userId, sessionId, { before, limit });
      return okJson(result);
    } catch (err) {
      if (err instanceof ChatDbError) return failJson(err.code, err.message, err.httpStatus);
      console.error("[chat/messages] list error", err);
      return failJson("INTERNAL_ERROR", "服务器内部错误", 500);
    }
  },
});
