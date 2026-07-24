/**
 * [INPUT]: 依赖 @ai-sdk/react useChat、ai DefaultChatTransport（via createChatTransport）、
 *         ai lastAssistantMessageIsCompleteWithToolCalls、shared/ui Button/Card/Input、
 *         agent-panel.store、chat-transport、services/chat/client-tools、
 *         services/chat/session.api（listSessionMessages）、
 *         features/agent-chat/tools/memo-write-tools（isWriteTool）、
 *         features/agent-chat/components/tools/ToolConfirmCard、
 *         app/providers/AuthProvider（useAuth）
 * [OUTPUT]: 对外提供 ChatPanelInner（单会话对话面板；key-remount 切换干净重启）
 * [POS]: widgets/AgentPanel 对话内核；AgentPanel 按 currentSessionId 作 key 挂载
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 切换原理：
 * - 父级给 key=currentSessionId；换会话 key 变 → remount → useChat 用新 initialMessages 干净重起
 * - 不手动 setMessages 清旧消息，避免残留旧流状态
 *
 * 历史翻页：
 * - mount 时拉第一页消息作为 initialMessages
 * - 顶部「加载更多」用 before 游标 prepend 老消息
 * - 翻页用 setMessages 合并（非 streaming 时才允许）
 *
 * 工具回灌契约：
 * - onToolCall 命中镜像工具后必须显式 addToolResult（返回值会被 AI SDK 丢弃）
 * - 未知工具 / execute 抛错也要 addToolResult（output-error），否则 agent loop 卡死
 * - sendAutomaticallyWhen 收齐工具结果后自动发起下一轮
 *
 * 写权拦截（第二道）：
 * - create_/update_ 前缀工具在 onToolCall 检查 canWrite，无写权直接回灌只读错误
 * - chat/ 侧第一道已按前缀过滤 schema，此处为双重保险
 */
import { useChat } from "@ai-sdk/react";
import { lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from "ai";
import {
  Eye,
  FilePlus,
  Loader2,
  Pencil,
  Search,
  SendHorizontal,
  Square,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../app/providers/AuthProvider";
import { ToolConfirmCard } from "../../features/agent-chat/components/tools/ToolConfirmCard";
import { isWriteTool } from "../../features/agent-chat/tools/memo-write-tools";
import {
  ChatClientError,
  createChatTransport,
  isChatConfigured,
} from "../../shared/services/chat/chat-transport";
import { findClientTool } from "../../shared/services/chat/client-tools";
import { listSessionMessages, type ChatMessage } from "../../shared/services/chat/session.api";
import { Button, Card, Input } from "../../shared/ui";
import { MarkdownMessage } from "./MarkdownMessage";
import { getMessageText } from "./message-text";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** 工具名 → 友好标签 + 图标（渲染状态指示器用） */
const TOOL_META: Record<string, { label: string; icon: LucideIcon }> = {
  search_memos: { label: "搜索备忘录", icon: Search },
  read_current_memo: { label: "读取当前备忘录", icon: Eye },
  create_memo: { label: "创建备忘录", icon: FilePlus },
  update_memo: { label: "修改备忘录", icon: Pencil },
} as const;

/** 遍历 message.parts，找出 state=input-available 的工具调用（正在执行中） */
function runningTools(
  message: UIMessage | undefined,
): Array<{ name: string }> {
  if (!message) return [];
  const out: Array<{ name: string }> = [];
  for (const p of message.parts) {
    const part = p as { type?: string; state?: string; toolName?: string };
    if (part.state !== "input-available") continue;
    if (part.type === "dynamic-tool") {
      out.push({ name: part.toolName ?? "工具" });
    } else if (part.type?.startsWith("tool-")) {
      out.push({ name: part.type.slice("tool-".length) });
    }
  }
  return out;
}

/** 是否有正在执行的工具（用于"正在思考"提示的去重） */
function hasRunningTool(message: UIMessage | undefined): boolean {
  return runningTools(message).length > 0;
}

function friendlyError(error: Error | undefined): string | null {
  if (!error) return null;
  if (error instanceof ChatClientError) {
    if (error.code === "UNAUTHORIZED" || error.code === "SESSION_ERROR") {
      return error.message;
    }
    if (error.code === "CHAT_NOT_CONFIGURED") {
      return error.message;
    }
    return `${error.message}${error.code ? `（${error.code}）` : ""}`;
  }
  const msg = error.message?.trim();
  if (msg) return msg;
  return "对话失败，请稍后重试。";
}

/** ChatMessage（DB 行）→ UIMessage 映射 */
function toUIMessage(msg: ChatMessage): UIMessage {
  return {
    id: msg.client_id,
    role: msg.role,
    parts: (msg.content ?? []) as UIMessage["parts"],
  } as UIMessage;
}

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

export type ChatPanelInnerProps = {
  sessionId: string | null;
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function ChatPanelInner({ sessionId }: ChatPanelInnerProps) {
  const { isAuthenticated } = useAuth();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  // stop 按钮的 AbortController：贯穿到 tool.execute，可中断 HTTP 与 ConfirmationStore
  const abortRef = useRef<AbortController | null>(null);

  // 写权跟人走
  const canWrite = isAuthenticated;

  // transport 带 sessionId body（组件每次 remount 重建，sessionId 不变）
  const transport = useMemo(
    () => createChatTransport(sessionId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /* ---- 历史加载 ---- */
  const [historyLoading, setHistoryLoading] = useState(!!sessionId);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setHistoryLoading(false);
      setInitialMessages([]);
      setCursor(null);
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);

    listSessionMessages(sessionId, { limit: 50 })
      .then((page) => {
        if (cancelled) return;
        setInitialMessages(page.messages.map(toUIMessage));
        setCursor(page.nextCursor);
      })
      .catch((err) => {
        console.error("[ChatPanelInner] load history failed:", err);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  /* ---- useChat ---- */
  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    clearError,
    addToolResult,
    setMessages,
  } = useChat({
    transport,
    messages: initialMessages,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: async ({ toolCall }) => {
      const toolName = toolCall.toolName;
      const tool = findClientTool(toolName);

      if (!tool) {
        await addToolResult({
          tool: toolName,
          toolCallId: toolCall.toolCallId,
          state: "output-error",
          errorText: `未知工具: ${toolName}`,
        });
        return;
      }

      if (isWriteTool(toolName) && !canWrite) {
        await addToolResult({
          tool: toolName,
          toolCallId: toolCall.toolCallId,
          output: { ok: false, error: "只读" },
        });
        return;
      }

      try {
        const output = await tool.execute(toolCall.input, {
          signal: abortRef.current?.signal,
        });
        await addToolResult({
          tool: toolName,
          toolCallId: toolCall.toolCallId,
          output,
        });
      } catch (err) {
        await addToolResult({
          tool: toolName,
          toolCallId: toolCall.toolCallId,
          state: "output-error",
          errorText: err instanceof Error ? err.message : "工具执行失败",
        });
      }
    },
  });

  const isStreaming = status === "streaming";
  const isSubmitted = status === "submitted";
  const isPending = isStreaming || isSubmitted;
  const errorText = friendlyError(error);
  const configured = isChatConfigured();
  const isEmpty = messages.length === 0 && !historyLoading;

  /* 新消息 / 流式增长时滚到底（仅非加载更多时） */
  useEffect(() => {
    if (loadingMore) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status, loadingMore]);

  /* 加载更多历史 */
  const handleLoadMore = useCallback(async () => {
    if (!sessionId || !cursor || loadingMore || isStreaming) return;
    setLoadingMore(true);
    try {
      const el = listRef.current;
      const prevScrollHeight = el ? el.scrollHeight : 0;
      const page = await listSessionMessages(sessionId, {
        before: cursor,
        limit: 50,
      });
      const olderMessages = page.messages.map(toUIMessage);
      setMessages((current) => [...olderMessages, ...current]);
      setCursor(page.nextCursor);
      // prepend 后恢复阅读位置
      requestAnimationFrame(() => {
        if (el) {
          el.scrollTop = el.scrollHeight - prevScrollHeight;
        }
      });
    } catch (err) {
      console.error("[ChatPanelInner] load more failed:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [sessionId, cursor, loadingMore, isStreaming, setMessages]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || isPending) return;
    if (error) clearError();
    // 新一轮对话：新建 AbortController，供 onToolCall 内 tool.execute 使用
    abortRef.current = new AbortController();
    setDraft("");
    try {
      await sendMessage({ text });
    } catch {
      // useChat 会把错误写入 error；此处避免未捕获 Promise
    }
  }

  /* ---- 渲染 ---- */

  if (historyLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center gap-4">
        <Loader2 className="size-icon-sm animate-spin" aria-hidden="true" />
        <p className="font-helvetica-now text-ui text-graphite">加载对话历史…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div
        ref={listRef}
        className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {!configured ? (
          <Card tone="chalk" className="rounded-md p-8">
            <p className="font-helvetica-now text-ui text-graphite">
              未配置助手服务。请在{" "}
              <code className="font-helvetica-now text-meta">app/.env.local</code>{" "}
              设置{" "}
              <code className="font-helvetica-now text-meta">VITE_CHAT_BASE_URL</code>
              （如 http://localhost:20002）。
            </p>
          </Card>
        ) : null}

        {configured && isEmpty && !errorText ? (
          <Card tone="chalk" className="rounded-md p-6">
            <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
              开始对话
            </p>
            <p className="mt-4 font-helvetica-now text-ui leading-relaxed text-ink">
              问我任何问题，或让我帮你整理备忘录。
            </p>
          </Card>
        ) : null}

        {/* 加载更多历史 */}
        {cursor && !isEmpty ? (
          <div className="flex justify-center py-4">
            <Button
              variant="ghost"
              size="sm"
              loading={loadingMore}
              disabled={isPending || loadingMore}
              onClick={() => void handleLoadMore()}
            >
              加载更多
            </Button>
          </div>
        ) : null}

        {messages.map((message) => {
          const text = getMessageText(message);
          const isUser = message.role === "user";
          return (
            <div key={message.id}>
              <Card
                tone={isUser ? "ink" : "chalk"}
                className={`rounded-md p-6 ${isUser ? "ml-6" : ""}`}
              >
                <p className="font-helvetica-now text-label font-medium uppercase opacity-70">
                  {isUser ? "You" : "Assistant"}
                </p>
                <div className="mt-2">
                  {isUser ? (
                    <p className="whitespace-pre-wrap font-helvetica-now text-ui leading-relaxed">
                      {text}
                    </p>
                  ) : text ? (
                    <MarkdownMessage content={text} />
                  ) : isStreaming ? (
                    <p className="font-helvetica-now text-ui text-graphite">…</p>
                  ) : null}
                  {/* tool 执行中状态指示器：spinner + 图标 + 友好名；读写分色 */}
                  {!isUser && runningTools(message).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {runningTools(message).map((t, i) => {
                        const meta = TOOL_META[t.name];
                        const Icon = meta?.icon;
                        const label = meta?.label ?? t.name;
                        const tone = isWriteTool(t.name)
                          ? "bg-bone text-warning"
                          : "bg-bone text-graphite";
                        return (
                          <span
                            key={`${t.name}-${i}`}
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-helvetica-now text-meta ${tone}`}
                          >
                            <Loader2
                              className="h-3 w-3 animate-spin"
                              aria-hidden="true"
                            />
                            {Icon ? (
                              <Icon
                                className="h-3 w-3"
                                aria-hidden="true"
                              />
                            ) : null}
                            {label}…
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
              {!isUser && <ToolConfirmCard message={message} />}
            </div>
          );
        })}

        {isSubmitted && messages[messages.length - 1]?.role === "user" ? (
          <Card tone="chalk" className="rounded-md p-6">
            <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
              Assistant
            </p>
            <p className="mt-2 font-helvetica-now text-ui text-graphite">正在连接…</p>
          </Card>
        ) : isStreaming && !hasRunningTool(messages[messages.length - 1]) ? (
          <Card tone="chalk" className="rounded-md p-6">
            <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
              Assistant
            </p>
            <p className="mt-2 font-helvetica-now text-ui text-graphite">正在思考…</p>
          </Card>
        ) : null}

        {errorText ? (
          <Card tone="paper" className="rounded-md border border-vellum p-6">
            <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
              出错了
            </p>
            <p className="mt-2 font-helvetica-now text-ui leading-relaxed text-ink">
              {errorText}
            </p>
            <div className="mt-6">
              <Button variant="outline" size="sm" onClick={() => clearError()}>
                重试
              </Button>
            </div>
          </Card>
        ) : null}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-vellum px-6 py-4">
        <div className="flex gap-4">
          <Input
            aria-label="输入助手消息"
            className="min-w-0 flex-1"
            placeholder={
              configured ? "问备忘录助手…" : "请先配置 VITE_CHAT_BASE_URL"
            }
            value={draft}
            disabled={!configured || isPending}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
          />
          {isPending ? (
            <Button
              variant="outline"
              size="sm"
              aria-label="停止生成"
              icon={<Square aria-hidden="true" />}
              onClick={() => {
                // 先 abort 贯穿到 tool.execute（中断 fetch + reject ConfirmationStore），
                // 再 stop 中断 SSE 流读取；两者缺一不可
                abortRef.current?.abort();
                abortRef.current = null;
                void stop();
              }}
            >
              停止
            </Button>
          ) : (
            <Button
              size="sm"
              aria-label="发送消息"
              icon={<SendHorizontal aria-hidden="true" />}
              disabled={!configured || !draft.trim() || isPending}
              onClick={() => {
                void handleSend();
              }}
            >
              发送
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
