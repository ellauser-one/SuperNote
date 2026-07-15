/**
 * [INPUT]: 依赖 zod
 * [OUTPUT]: 对外提供 profiles 请求契约 schema 与 z.infer 类型
 * [POS]: dto 层；不含 id/user_id 字段——身份只来自 JWT
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { z } from "zod";

/** username: 3–24 位字母数字下划线（与 DB check 一致） */
const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[a-zA-Z0-9_]+$/, "username must be [A-Za-z0-9_]{3,24}");

const displayNameSchema = z.string().trim().max(64);

/**
 * PATCH /v1/profiles/me
 * 禁止 body 携带 id / user_id；schema 中根本不包含这些字段。
 */
export const updateProfileBodySchema = z
  .object({
    username: usernameSchema.optional(),
    displayName: displayNameSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (v) => v.username !== undefined || v.displayName !== undefined,
    { message: "At least one of username or displayName is required" },
  );

export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;

/**
 * PUT /v1/profiles/me — 首次同步 / upsert
 * id 与 email 只由 service 从 JWT 写入，body 不可指定身份。
 */
export const upsertProfileBodySchema = z
  .object({
    username: usernameSchema.nullable().optional(),
    displayName: displayNameSchema.nullable().optional(),
  })
  .strict();

export type UpsertProfileBody = z.infer<typeof upsertProfileBodySchema>;

/** GET /v1/profiles/username-available?username= */
export const usernameAvailableQuerySchema = z.object({
  username: usernameSchema,
});

export type UsernameAvailableQuery = z.infer<typeof usernameAvailableQuerySchema>;
