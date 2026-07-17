/**
 * [INPUT]: 依赖 @ai-sdk/react useChat、ai DefaultChatTransport（via createChatTransport）、
 *         shared/ui Button/Card/Input、agent-panel.store、chat-transport
 * [OUTPUT]: 对外提供 AgentPanel（右侧备忘录助手 SSE 对话面板）
 * [POS]: widgets 右侧 Agent 面板；AppShell 按 open 状态挂载
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useChat } from "@ai-sdk/react";
import { Bot, PanelRightClose, SendHorizontal, Square } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  ChatClientError,
  createChatTransport,
  isChatConfigured,
} from "../../shared/services/chat/chat-transport";
import { useAgentPanelStore } from "../../shared/stores/agent-panel.store";
import { Button, Card, Input } from "../../shared/ui";
import { MarkdownMessage } from "./MarkdownMessage";
import { getMessageText } from "./message-text";

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
  // useChat / fetch 包装错误
  const msg = error.message?.trim();
  if (msg) return msg;
  return "对话失败，请稍后重试。";
}

export function AgentPanel() {
  const closePanel = useAgentPanelStore((s) => s.closePanel);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(() => createChatTransport(), []);

  const { messages, sendMessage, status, stop, error, clearError } = useChat({
    transport,
  });

  const isStreaming = status === "streaming" || status === "submitted";
  const errorText = friendlyError(error);
  const configured = isChatConfigured();
  const isEmpty = messages.length === 0;

  /* 新消息 / 流式增长时滚到底 */
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || isStreaming) return;
    if (error) clearError();
    setDraft("");
    try {
      await sendMessage({ text });
    } catch {
      // useChat 会把错误写入 error；此处避免未捕获 Promise
    }
  }

  return (
    <aside className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border-l border-vellum bg-bone">
      {/* Header */}
      <div className="shrink-0 border-b border-vellum px-10 py-10">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
              Memo Agent
            </p>
            <h2 className="mt-2 flex items-center gap-6 truncate font-davinci text-title font-medium text-ink">
              <Bot className="size-icon-sm shrink-0" aria-hidden="true" />
              <span className="truncate">备忘录助手</span>
            </h2>
          </div>

          <Button
            variant="ghost"
            size="sm"
            aria-label="关闭助手面板"
            icon={<PanelRightClose aria-hidden="true" />}
            onClick={closePanel}
          >
            关闭
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-10 py-10"
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
          <Card tone="chalk" className="rounded-md p-8">
            <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
              开始对话
            </p>
            <p className="mt-4 font-helvetica-now text-ui leading-relaxed text-ink">
              我是备忘录助手。可以帮你提炼要点、改写草稿、规划文件夹命名。
              输入一句话，我会流式回复。
            </p>
            <ul className="mt-8 list-disc space-y-4 pl-16 font-helvetica-now text-meta text-graphite">
              <li>把这段灵感整理成可执行待办</li>
              <li>给「产品定价」备忘录起个清晰标题</li>
              <li>用三句话总结今天的会议记录</li>
            </ul>
          </Card>
        ) : null}

        {messages.map((message) => {
          const text = getMessageText(message);
          const isUser = message.role === "user";
          return (
            <Card
              key={message.id}
              tone={isUser ? "ink" : "chalk"}
              className={`rounded-md p-8 ${isUser ? "ml-6" : ""}`}
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
              </div>
            </Card>
          );
        })}

        {isStreaming && messages[messages.length - 1]?.role === "user" ? (
          <Card tone="chalk" className="rounded-md p-8">
            <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
              Assistant
            </p>
            <p className="mt-2 font-helvetica-now text-ui text-graphite">正在思考…</p>
          </Card>
        ) : null}

        {errorText ? (
          <Card tone="paper" className="rounded-md border border-vellum p-8">
            <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
              出错了
            </p>
            <p className="mt-2 font-helvetica-now text-ui leading-relaxed text-ink">
              {errorText}
            </p>
            <div className="mt-8">
              <Button variant="outline" size="sm" onClick={() => clearError()}>
                知道了
              </Button>
            </div>
          </Card>
        ) : null}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-vellum p-8">
        <div className="flex gap-4">
          <Input
            aria-label="输入助手消息"
            className="min-w-0 flex-1"
            placeholder={
              configured ? "问备忘录助手…" : "请先配置 VITE_CHAT_BASE_URL"
            }
            value={draft}
            disabled={!configured || isStreaming}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
          />
          {isStreaming ? (
            <Button
              variant="outline"
              size="sm"
              aria-label="停止生成"
              icon={<Square aria-hidden="true" />}
              onClick={() => {
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
              disabled={!configured || !draft.trim()}
              onClick={() => {
                void handleSend();
              }}
            >
              发送
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
