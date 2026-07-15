/**
 * [INPUT]: 依赖 TrustedUserContext 与用户消息
 * [OUTPUT]: 对外提供 generateReply（AI 生成用例；当前为可替换桩）
 * [POS]: services 层；后续接入 Mastra agents/workflows
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { TrustedUserContext } from "../common/user-context";

export type GenerateInput = {
  user: TrustedUserContext;
  message: string;
};

export type GenerateOutput = {
  reply: string;
  userId: string;
};

/**
 * AI 生成入口。
 * 桩实现：回显消息并标注 userId，验证「可信 user context」已贯通。
 * 接入 Mastra 时替换本函数体，签名保持不变。
 */
export async function generateReply(input: GenerateInput): Promise<GenerateOutput> {
  const { user, message } = input;
  const reply = `[chat] user=${user.userId} · ${message}`;
  return {
    reply,
    userId: user.userId,
  };
}
