/**
 * [INPUT]: 依赖 config/env；向 chat 发起 HTTP
 * [OUTPUT]: 对外提供 api → chat 转发（携带可信 user context）
 * [POS]: lib 集成层；service/api 不直接拼 chat headers
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { assertInternalServiceToken, env } from "../config/env";

export type TrustedUserContext = {
  userId: string;
  email: string | null;
};

export type ChatGenerateInput = TrustedUserContext & {
  message: string;
};

export type ChatGenerateResult = {
  reply: string;
  userId: string;
};

/**
 * 调用 chat `/v1/generate`。
 * chat 不验用户 JWT，只认 X-Service-Token + X-User-Id。
 */
export async function chatGenerate(input: ChatGenerateInput): Promise<ChatGenerateResult> {
  assertInternalServiceToken();

  const res = await fetch(`${env.chatUrl}/v1/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Token": env.internalServiceToken,
      "X-User-Id": input.userId,
      ...(input.email ? { "X-User-Email": input.email } : {}),
    },
    body: JSON.stringify({ message: input.message }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    reply?: string;
    userId?: string;
  };

  if (!res.ok) {
    throw new Error(body.error || `chat generate failed (${res.status})`);
  }

  return {
    reply: body.reply ?? "",
    userId: body.userId ?? input.userId,
  };
}
