/**
 * [INPUT]: 依赖 zod
 * [OUTPUT]: 对外提供 classifyBodySchema / FORBIDDEN_CLASSIFY_ID_KEYS
 * [POS]: dto 层 classify 请求体校验；router 消费，禁止 import Hono
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { z } from "zod";

/** body 中出现即 400 的身份键 */
export const FORBIDDEN_CLASSIFY_ID_KEYS = [
  "id",
  "user_id",
  "owner_id",
  "node_id",
] as const;

export const classifyBodySchema = z
  .object({
    memoId: z.string().uuid(),
  })
  .strict();

export type ClassifyBody = z.infer<typeof classifyBodySchema>;
