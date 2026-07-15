/**
 * [INPUT]: 依赖 lib/chat-client
 * [OUTPUT]: 对外提供 AI generate 业务编排
 * [POS]: service 层；userId 只来自 JWT Actor，不读 body.user_id
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { AppError } from "../common/app-error";
import { chatGenerate } from "../lib/chat-client";
import { ApiCode } from "../model/response.model";
import type { Actor } from "./profile.service";

export type AiGenerateResult = {
  reply: string;
  userId: string;
};

export async function generateAiReply(
  actor: Actor,
  message: string,
): Promise<AiGenerateResult> {
  try {
    return await chatGenerate({
      userId: actor.userId,
      email: actor.email,
      message,
    });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "AI generate failed";
    throw new AppError(ApiCode.BAD_GATEWAY, messageText, 502);
  }
}
