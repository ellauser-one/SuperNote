/**
 * [INPUT]: 依赖 zod
 * [OUTPUT]: 对外提供 createFolder / createMemo / update / move 等 schema
 * [POS]: dto 层 memo 请求体校验；router 消费，禁止 import Hono
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { z } from "zod";

/** body 中出现即 400 的身份键 */
export const FORBIDDEN_MEMO_ID_KEYS = [
  "id",
  "user_id",
  "owner_id",
  "node_id",
] as const;

const uuidOrNull = z.union([z.string().uuid(), z.null()]).optional();

const sortOrderSchema = z
  .union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/)])
  .optional();

export const createFolderBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    parent_id: uuidOrNull,
  })
  .strict();

export const createMemoBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    parent_id: uuidOrNull,
    content_mdx: z.string().max(500_000).optional(),
    sort_order: sortOrderSchema,
  })
  .strict();

export const updateMemoBodySchema = z
  .object({
    content_mdx: z.string().max(500_000).optional(),
    title: z.string().trim().min(1).max(200).optional(),
  })
  .strict()
  .refine(
    (v) => v.content_mdx !== undefined || v.title !== undefined,
    { message: "至少需要 content_mdx 或 title 之一" },
  );

export const renameNodeBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
  })
  .strict();

export const moveNodeBodySchema = z
  .object({
    parent_id: uuidOrNull,
    sort_order: sortOrderSchema,
  })
  .strict();

export const nodeIdParamSchema = z.string().uuid();

export type CreateFolderBody = z.infer<typeof createFolderBodySchema>;
export type CreateMemoBody = z.infer<typeof createMemoBodySchema>;
export type UpdateMemoBody = z.infer<typeof updateMemoBodySchema>;
export type RenameNodeBody = z.infer<typeof renameNodeBodySchema>;
export type MoveNodeBody = z.infer<typeof moveNodeBodySchema>;
