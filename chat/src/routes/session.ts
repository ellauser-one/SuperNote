/**
 * [INPUT]: 依赖 @mastra/core/server registerApiRoute、authMiddleware、
 *          repository/chat.repository（listSessions, createSession, updateSession, softDeleteSession）
 * [OUTPUT]: 对外提供 sessionRoutes — GET/POST/PATCH/DELETE 会话端点数组
 * [POS]: routes 层；由 mastra/index server.apiRoutes 挂载；统一 JSON 信封 { code, message, data }
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 鉴权：authMiddleware 保证已登录，userId 从 c.get('userId') 读取
 */
import { registerApiRoute } from "@mastra/core/server";

import { authMiddleware } from "@/middleware/auth";
import {
  listSessions,
  createSession,
  updateSession,
  softDeleteSession,
} from "@/repository/chat.repository";
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
/* GET /v1/sessions — 当前用户未软删会话列表                                      */
/* -------------------------------------------------------------------------- */

const listRoute = registerApiRoute("/v1/sessions", {
  method: "GET",
  middleware: [authMiddleware as never],
  handler: async (c) => {
    const userId = c.get("userId" as never) as unknown as string;
    try {
      const sessions = await listSessions(userId);
      return okJson(sessions);
    } catch (err) {
      if (err instanceof ChatDbError) return failJson(err.code, err.message, err.httpStatus);
      console.error("[chat/session] list error", err);
      return failJson("INTERNAL_ERROR", "服务器内部错误", 500);
    }
  },
});

/* -------------------------------------------------------------------------- */
/* POST /v1/sessions — 新建会话                                                 */
/* -------------------------------------------------------------------------- */

const createRoute = registerApiRoute("/v1/sessions", {
  method: "POST",
  middleware: [authMiddleware as never],
  handler: async (c) => {
    const userId = c.get("userId" as never) as unknown as string;
    try {
      const body = await c.req.json<{ title?: string; model?: string }>();
      const session = await createSession(userId, body);
      return okJson(session, "created", 201);
    } catch (err) {
      if (err instanceof ChatDbError) return failJson(err.code, err.message, err.httpStatus);
      console.error("[chat/session] create error", err);
      return failJson("INTERNAL_ERROR", "服务器内部错误", 500);
    }
  },
});

/* -------------------------------------------------------------------------- */
/* PATCH /v1/sessions/:id — 改 title / model                                   */
/* -------------------------------------------------------------------------- */

const updateRoute = registerApiRoute("/v1/sessions/:id", {
  method: "PATCH",
  middleware: [authMiddleware as never],
  handler: async (c) => {
    const userId = c.get("userId" as never) as unknown as string;
    const sessionId = c.req.param("id");
    try {
      const body = await c.req.json<{ title?: string; model?: string }>();
      const session = await updateSession(userId, sessionId, body);
      return okJson(session);
    } catch (err) {
      if (err instanceof ChatDbError) return failJson(err.code, err.message, err.httpStatus);
      console.error("[chat/session] update error", err);
      return failJson("INTERNAL_ERROR", "服务器内部错误", 500);
    }
  },
});

/* -------------------------------------------------------------------------- */
/* DELETE /v1/sessions/:id — 软删（写 deleted_at）                              */
/* -------------------------------------------------------------------------- */

const deleteRoute = registerApiRoute("/v1/sessions/:id", {
  method: "DELETE",
  middleware: [authMiddleware as never],
  handler: async (c) => {
    const userId = c.get("userId" as never) as unknown as string;
    const sessionId = c.req.param("id");
    try {
      await softDeleteSession(userId, sessionId);
      return okJson(null, "deleted");
    } catch (err) {
      if (err instanceof ChatDbError) return failJson(err.code, err.message, err.httpStatus);
      console.error("[chat/session] delete error", err);
      return failJson("INTERNAL_ERROR", "服务器内部错误", 500);
    }
  },
});

// 导出数组，供 mastra/index apiRoutes 展开
export const sessionRoutes = [listRoute, createRoute, updateRoute, deleteRoute];
