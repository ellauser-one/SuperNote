/**
 * [INPUT]: 依赖 zod
 * [OUTPUT]: 对外提供 patchProfileBodySchema / PatchProfileBody / forbiddenIdKeys
 * [POS]: dto 层 profile 请求体校验；router 消费，禁止 import Hono
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { z } from "zod";

/** body 中出现即 400 的身份键（user id 只能来自 JWT） */
export const FORBIDDEN_PROFILE_ID_KEYS = [
  "id",
  "user_id",
  "owner_id",
] as const;

const socialLinksSchema = z.record(z.string(), z.unknown()).nullable().optional();

/**
 * PATCH /profile 允许字段。
 * 拒绝 id / user_id / owner_id（router 预检 + .strict()）。
 */
export const patchProfileBodySchema = z
  .object({
    nickname: z.string().trim().min(1).max(80).optional(),
    username: z
      .string()
      .trim()
      .min(3)
      .max(24)
      .regex(/^[a-zA-Z0-9_]+$/, "username 仅允许字母、数字、下划线")
      .nullable()
      .optional(),
    avatar_url: z.string().url().max(2048).nullable().optional(),
    age: z.number().int().min(0).max(150).nullable().optional(),
    bio: z.string().max(2000).nullable().optional(),
    headline: z.string().max(200).nullable().optional(),
    location: z.string().max(200).nullable().optional(),
    website_url: z.string().url().max(2048).nullable().optional(),
    company: z.string().max(200).nullable().optional(),
    role: z.string().max(200).nullable().optional(),
    honor_title: z.string().max(200).nullable().optional(),
    social_links: socialLinksSchema,
  })
  .strict();

export type PatchProfileBody = z.infer<typeof patchProfileBodySchema>;
