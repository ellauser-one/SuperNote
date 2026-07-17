/**
 * [INPUT]: 依赖 @mastra/core/server、@mastra/core/tools createTool、@mastra/ai-sdk
 *          handleChatStream、ai createUIMessageStreamResponse、authMiddleware、env、
 *          mastra/tools/schemas、repository/chat.repository
 * [OUTPUT]: 对外提供 chatRoute — POST /v1/chat（SSE UI message stream + 消息落库）
 * [POS]: routes 层；由 mastra/index server.apiRoutes 挂载；
 *        CLIENT_TOOLS 壳定义与 clientTools 注入点同驻本文件（传输层装配细节）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 关键：maxSteps 必须显式传入，否则 AI SDK 默认 5 步会腰斩长任务。
 *
 * 消息落库：
 * - 入口：整批 upsert body.messages，用 (session_id, client_id) onConflict 幂等
 * - 流末：stream.tee() 分一支，累积本轮完整 assistant UIMessage 后落库（带重试）
 * - 日志不打印完整 content
 *
 * 工具分类铁律：
 * - 服务端工具（有 execute）才能绑 Agent 构造器 tools 字段
 * - 客户端工具（无 execute 壳）只能经 params.clientTools 注入；绑进 Agent 构造器
 *   会被当 server tool，回退 return inputData，agent loop 直接废掉
 * - Mastra 注入时会剥离 execute 并标记 client-tool，tool-call 吐进 SSE，
 *   由前端 onToolCall 执行、addToolResult 回灌
 *
 * 写权过滤铁律：
 * - 写工具统一 create_/update_ 前缀；无写权用户请求时按前缀过滤掉写工具
 * - 前端 onToolCall 做第二道拦截（双重保险）
 *
 * Memory 装配：
 * - 按登录态组装记忆域：resource=userId（用户级工作记忆）、thread=sessionId（会话级历史）
 * - 经 params.memory 传给 handleChatStream
 * - 前端全量透传消息历史，不靠召回拼历史；lastMessages 去重 + TokenLimiter 收口
 */
import { handleChatStream } from "@mastra/ai-sdk";
import type { ToolsInput } from "@mastra/core/agent";
import { registerApiRoute } from "@mastra/core/server";
import { createTool } from "@mastra/core/tools";
import { createUIMessageStreamResponse } from "ai";

import { env } from "@/config/env";
import {
  createMemoInputSchema,
  createMemoOutputSchema,
  readCurrentMemoInputSchema,
  readCurrentMemoOutputSchema,
  searchMemosInputSchema,
  searchMemosOutputSchema,
  updateMemoInputSchema,
  updateMemoOutputSchema,
} from "@/mastra/tools/schemas";
import { authMiddleware } from "@/middleware/auth";
import {
  upsertMessages,
  touchSession,
  createSession,
} from "@/repository/chat.repository";

/* -------------------------------------------------------------------------- */
/* CLIENT_TOOLS：无 execute 的客户端工具壳                                       */
/* -------------------------------------------------------------------------- */

/**
 * 只读客户端工具壳（无 execute）。
 * schema 真相源在 mastra/tools/schemas.ts；app/ 侧存在同 id 镜像工具（带 execute）。
 */
const READ_TOOLS = {
  search_memos: createTool({
    id: "search_memos",
    description:
      "搜索当前登录用户的备忘录，返回紧凑列表（id/标题/分类/摘要，无完整正文）。需要了解用户已有备忘录时调用。",
    inputSchema: searchMemosInputSchema,
    outputSchema: searchMemosOutputSchema,
  }),
  read_current_memo: createTool({
    id: "read_current_memo",
    description:
      "读取用户当前在前端选中/打开的那条备忘录的紧凑视图。用户引用「当前这条」「这条备忘录」时先调用。",
    inputSchema: readCurrentMemoInputSchema,
    outputSchema: readCurrentMemoOutputSchema,
  }),
} satisfies ToolsInput;

/**
 * 写入客户端工具壳（无 execute）。
 * create_/update_ 前缀约定：无写权用户注入时按前缀过滤。
 */
const WRITE_TOOLS = {
  create_memo: createTool({
    id: "create_memo",
    description:
      "创建新备忘录。前端会弹出确认卡，用户确认后才真正写入。必须先调 search_memos 确认无重复。",
    inputSchema: createMemoInputSchema,
    outputSchema: createMemoOutputSchema,
  }),
  update_memo: createTool({
    id: "update_memo",
    description:
      "修改已有备忘录的标题、正文、分类、标签或置顶状态。前端会弹出确认卡，用户确认后才真正写入。",
    inputSchema: updateMemoInputSchema,
    outputSchema: updateMemoOutputSchema,
  }),
} satisfies ToolsInput;

/**
 * 按写权组装工具表。无写权用户只给只读工具，模型看不到写 schema。
 * 当前默认所有已登录用户都有写权；未来扩展为角色检查时只改此函数。
 */
function buildClientTools(canWrite: boolean): ToolsInput {
  if (!canWrite) return READ_TOOLS;
  return { ...READ_TOOLS, ...WRITE_TOOLS };
}

export const chatRoute = registerApiRoute("/v1/chat", {
  method: "POST",
  // Mastra 内嵌 hono 与顶层 hono 类型不完全兼容，此处做窄化断言
  middleware: [authMiddleware as never],
  handler: async (c) => {
    const mastra = c.get("mastra");
    const userId = c.get("userId" as never) as unknown as string;
    const params = await c.req.json();

    // authMiddleware 已保证请求已登录；未来扩展角色检查时从 Mastra requestContext 读取
    // 写权过滤在 app/ 侧还有第二道拦截（双重保险）
    const canWrite = true;

    /* ------------------------------------------------------------------ */
    /* 消息落库 — 入口：upsert 用户消息（幂等）                              */
    /* ------------------------------------------------------------------ */
    const sessionId: string | undefined = params.sessionId;
    const incomingMessages: Array<{
      id?: string;
      client_id?: string;
      role?: string;
      parts?: unknown;
      content?: unknown;
    }> = params.messages ?? [];

    let resolvedSessionId = sessionId;
    if (userId && incomingMessages.length > 0) {
      try {
        // 自动建会话（无 sessionId 时）
        if (!resolvedSessionId) {
          const session = await createSession(userId, {
            model: params.model ?? env.DEFAULT_MODEL,
          });
          resolvedSessionId = session.id;
        }
        // 幂等 upsert 用户消息
        const userMsgs = incomingMessages
          .filter((m) => m.role === "user")
          .map((m) => ({
            client_id: m.client_id ?? m.id ?? crypto.randomUUID(),
            role: "user" as const,
            content: m.parts ?? m.content ?? [],
          }));
        if (userMsgs.length > 0) {
          await upsertMessages(userId, resolvedSessionId, userMsgs);
          console.log("[chat/persist] user messages upserted", {
            sessionId: resolvedSessionId,
            count: userMsgs.length,
          });
        }
      } catch (err) {
        // 落库失败不阻塞聊天流
        console.error("[chat/persist] user message upsert failed:", err);
      }
    }

    // ai@7 对齐 AI SDK v6 流契约；maxSteps 必须显式传（默认 5 会腰斩）
    // clientTools 每次请求都注入：客户端工具壳随流吐 tool-call，等前端回灌结果
    // memory: resource=userId（跨会话工作记忆）、thread=sessionId（会话内历史）
    const stream = await handleChatStream({
      mastra,
      agentId: "memo-agent",
      version: "v6",
      params: {
        ...params,
        maxSteps: env.MAX_STEPS,
        clientTools: buildClientTools(canWrite),
        // 仅当 sessionId 和 userId 都存在时才挂 memory 域
        ...(resolvedSessionId && userId
          ? {
              memory: {
                resource: userId,
                thread: resolvedSessionId,
              },
            }
          : {}),
      },
    });

    /* ------------------------------------------------------------------ */
    /* 消息落库 — 流末：tee 分一支，累积 assistant 响应后落库              */
    /* ------------------------------------------------------------------ */
    const [clientStream, persistStream] = stream.tee();

    if (resolvedSessionId && userId) {
      const sid = resolvedSessionId;
      const uid = userId;
      // 后台异步消费，不阻塞响应
      consumeAndPersist(persistStream, sid, uid).catch((err) => {
        console.error("[chat/persist] assistant persist background error:", err);
      });
    }

    return createUIMessageStreamResponse({ stream: clientStream });
  },
});

/* -------------------------------------------------------------------------- */
/* 流末 assistant 累积 + 落库（带重试）                                          */
/* -------------------------------------------------------------------------- */

const MAX_PERSIST_RETRIES = 2;

async function consumeAndPersist(
  stream: ReadableStream,
  sessionId: string,
  userId: string,
): Promise<void> {
  const reader = stream.getReader();
  const textParts: string[] = [];
  let assistantClientId: string | null = null;

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // value 是 UIMessageChunk 结构化对象，非原始字节
      const chunk = value as Record<string, unknown>;
      const type = chunk.type as string | undefined;

      if (type === "start" && chunk.messageId) {
        assistantClientId = `assistant-${chunk.messageId}`;
      }
      if (
        (type === "text" || type === "text-delta") &&
        typeof chunk.text === "string"
      ) {
        textParts.push(chunk.text as string);
      }
    }
  } catch (err) {
    console.error("[chat/persist] stream read error:", err);
    return;
  }

  // 有内容才落库
  if (!assistantClientId || textParts.length === 0) {
    console.log("[chat/persist] no assistant content to persist");
    return;
  }

  const content = [{ type: "text", text: textParts.join("") }];
  console.log("[chat/persist] persisting assistant message", {
    sessionId,
    contentLength: textParts.join("").length,
  });

  for (let attempt = 0; attempt <= MAX_PERSIST_RETRIES; attempt++) {
    try {
      await upsertMessages(userId, sessionId, [
        { client_id: assistantClientId, role: "assistant", content },
      ]);
      await touchSession(userId, sessionId);
      console.log("[chat/persist] assistant message persisted");
      return;
    } catch (err) {
      console.error(
        `[chat/persist] assistant persist attempt ${attempt + 1} failed:`,
        err,
      );
      if (attempt < MAX_PERSIST_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  console.error("[chat/persist] assistant persist exhausted retries");
}
