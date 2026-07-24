/**
 * [INPUT]: 依赖 zod
 * [OUTPUT]: 对外提供 feedbackBodySchema / FORBIDDEN_FEEDBACK_ID_KEYS
 * [POS]: dto 层 feedback 请求体校验；router 消费，禁止 import Hono
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { z } from "zod";

/** body 中出现即 400 的身份键 */
export const FORBIDDEN_FEEDBACK_ID_KEYS = [
  "id",
  "user_id",
  "owner_id",
] as const;

export const feedbackBodySchema = z
  .object({
    page: z.string().trim().max(200).default("unknown"),
    message: z.string().trim().min(1).max(5000),
    screenshot_url: z.string().url().max(2000).optional(),
  })
  .strict();

export type FeedbackBody = z.infer<typeof feedbackBodySchema>;
