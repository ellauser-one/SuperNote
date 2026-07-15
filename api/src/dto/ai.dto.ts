/**
 * [INPUT]: 依赖 zod
 * [OUTPUT]: 对外提供 AI generate 请求契约
 * [POS]: dto 层；userId 不在 body，只来自 JWT
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { z } from "zod";

export const aiGenerateBodySchema = z
  .object({
    message: z.string().trim().min(1).max(8000),
  })
  .strict();

export type AiGenerateBody = z.infer<typeof aiGenerateBodySchema>;
