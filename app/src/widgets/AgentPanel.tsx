/**
 * [INPUT]: 依赖 shared/ui 的 Button/Input/Card/Dialog，依赖 React useState 管理本地模拟消息
 * [OUTPUT]: 对外提供 AgentPanel
 * [POS]: widgets 右侧 Agent 面板；视觉 token 全部来自 index.css
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { SendHorizontal } from "lucide-react";
import { useState } from "react";

import { Button, Card, Dialog, Input } from "../shared/ui";

type Message = {
  role: "agent" | "user";
  text: string;
};

const initialMessages: Message[] = [
  { role: "agent", text: "我会先找重复、空标题和孤立片段，但这里只做前端模拟。" },
  { role: "user", text: "把今天的灵感放到合适的位置。" },
  { role: "agent", text: "建议归入「产品想法 / SuperNote」并补一个清晰标题。" },
];

export function AgentPanel() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  function submitMessage() {
    const text = draft.trim();

    if (!text) {
      return;
    }

    setMessages((current) => [
      ...current,
      { role: "user", text },
      { role: "agent", text: "已收到。当前版本仅模拟清洁建议，不会调用模型或写入后端。" },
    ]);
    setDraft("");
  }

  return (
    <aside className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border-l border-vellum bg-bone">
      <div className="shrink-0 border-b border-vellum px-10 py-10">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
              Agent Panel
            </p>
            <h2 className="mt-2 truncate font-davinci text-title font-medium text-ink">
              备忘录保洁
            </h2>
          </div>

          <Dialog.Root>
            <Dialog.Trigger className="ds-button ds-button--outline ds-button--sm">
              说明
            </Dialog.Trigger>
            <Dialog.Content>
              <Dialog.Title>模拟面板</Dialog.Title>
              <Dialog.Description>
                这里展示用户端交互壳：输入、追加消息、返回模拟整理建议。它不连接 chat 或 api。
              </Dialog.Description>
              <div className="mt-16 flex justify-end">
                <Dialog.Close className="ds-button ds-button--primary ds-button--sm">
                  知道了
                </Dialog.Close>
              </div>
            </Dialog.Content>
          </Dialog.Root>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-10 py-10">
        {messages.map((message, index) => (
          <Card
            key={`${message.role}-${index}`}
            tone={message.role === "agent" ? "chalk" : "ink"}
            className={`rounded-md p-8 ${message.role === "user" ? "ml-6" : ""}`}
          >
            <p className="font-helvetica-now text-label font-medium uppercase opacity-70">
              {message.role === "agent" ? "Cleaner" : "You"}
            </p>
            <p className="mt-2 font-helvetica-now text-ui leading-relaxed">{message.text}</p>
          </Card>
        ))}
      </div>

      <div className="shrink-0 border-t border-vellum p-8">
        <div className="flex gap-4">
          <Input
            aria-label="输入模拟聊天消息"
            className="min-w-0 flex-1"
            placeholder="整理请求..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submitMessage();
              }
            }}
          />
          <Button
            aria-label="发送模拟消息"
            size="sm"
            icon={<SendHorizontal aria-hidden="true" />}
            onClick={submitMessage}
          >
            发送
          </Button>
        </div>
      </div>
    </aside>
  );
}
