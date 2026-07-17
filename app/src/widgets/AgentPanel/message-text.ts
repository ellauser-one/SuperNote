/**
 * [INPUT]: 依赖 ai UIMessage
 * [OUTPUT]: 对外提供 getMessageText（从 parts 拼纯文本）
 * [POS]: widgets/AgentPanel 纯函数；MessageBubble / Markdown 渲染共用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { UIMessage } from "ai";

/** 从 UIMessage.parts 提取可见文本（流式过程中 text parts 会增长） */
export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } =>
        part.type === "text" && typeof (part as { text?: unknown }).text === "string",
    )
    .map((part) => part.text)
    .join("");
}
