/**
 * [INPUT]: 依赖 zod
 * [OUTPUT]: 对外提供 compactMemoSchema 与 search_memos / read_current_memo /
 *           create_memo / update_memo 的 input/output zod schema 及推断类型
 * [POS]: mastra/tools 全部工具的 schema 唯一真相源；routes/chat.ts 的 CLIENT_TOOLS
 *        直接消费，app/src/features/agent-chat/tools/memo-write-tools.ts 为手工镜像，改动须双向同步
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * schema 铁律：
 * - inputSchema 顶层必须 z.object，禁止顶层 union/discriminatedUnion
 *   （AI SDK 转 oneOf 缺 type:object，部分 provider 直接 400）
 * - 每个字段必须 .describe()，模型靠描述决定如何填参
 * - CompactMemo 只含 id/title/category/excerpt，禁止把完整正文喂给模型
 */
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* CompactMemo：喂给模型的备忘录最小视图                                          */
/* -------------------------------------------------------------------------- */

export const compactMemoSchema = z.object({
  id: z.string().describe("备忘录节点 id（memo_nodes.id）"),
  title: z.string().describe("备忘录标题"),
  category: z
    .string()
    .nullable()
    .describe("所在文件夹路径（如「工作/会议」）；根级备忘录为 null"),
  excerpt: z
    .string()
    .nullable()
    .describe("正文摘要（服务端截取的前 200 字，非全文）；空正文为 null"),
});

export type CompactMemo = z.infer<typeof compactMemoSchema>;

/* -------------------------------------------------------------------------- */
/* search_memos：按关键词/分类搜索用户备忘录（只读）                               */
/* -------------------------------------------------------------------------- */

export const searchMemosInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .optional()
    .describe("搜索关键词，匹配标题、摘要、分类路径；不传则按最近更新列出"),
  category: z
    .string()
    .min(1)
    .optional()
    .describe("按文件夹路径过滤（如「工作」），可与 query 叠加"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(10)
    .describe("返回条数上限，默认 10，最大 20"),
});

export const searchMemosOutputSchema = z.object({
  ok: z.boolean().describe("搜索是否执行成功"),
  memos: z
    .array(compactMemoSchema)
    .optional()
    .describe("命中的紧凑备忘录列表（按最近更新排序）；失败时缺省"),
  error: z.string().optional().describe("失败原因；成功时缺省"),
});

export type SearchMemosInput = z.infer<typeof searchMemosInputSchema>;
export type SearchMemosOutput = z.infer<typeof searchMemosOutputSchema>;

/* -------------------------------------------------------------------------- */
/* read_current_memo：读前端当前选中的备忘录（只读）                               */
/* -------------------------------------------------------------------------- */

export const readCurrentMemoInputSchema = z.object({});

export const readCurrentMemoOutputSchema = z.object({
  ok: z.boolean().describe("是否读到当前选中的备忘录"),
  memo: compactMemoSchema
    .optional()
    .describe("当前选中备忘录的紧凑视图；未选中时缺省"),
  error: z
    .string()
    .optional()
    .describe("未选中或读取失败的原因；成功时缺省"),
});

export type ReadCurrentMemoInput = z.infer<typeof readCurrentMemoInputSchema>;
export type ReadCurrentMemoOutput = z.infer<typeof readCurrentMemoOutputSchema>;

/* -------------------------------------------------------------------------- */
/* write-result：写入类工具共享输出 schema                                       */
/* -------------------------------------------------------------------------- */

export const writeResultMemoSchema = z.object({
  id: z.string().describe("备忘录节点 id"),
  title: z.string().describe("备忘录标题"),
  category: z
    .string()
    .nullable()
    .describe("所在文件夹路径；根级为 null"),
  updated_at: z.string().describe("更新时间戳"),
});

export type WriteResultMemo = z.infer<typeof writeResultMemoSchema>;

export const writeResultOutputSchema = z.object({
  ok: z.boolean().describe("写入是否成功"),
  memo: writeResultMemoSchema.optional().describe("成功时返回的备忘录摘要；失败时缺省"),
  error: z.string().optional().describe("失败原因（user_rejected / 只读 / 网络等）；成功时缺省"),
});

export type WriteResultOutput = z.infer<typeof writeResultOutputSchema>;

/* -------------------------------------------------------------------------- */
/* create_memo：创建新备忘录（写入，需用户确认）                                   */
/* -------------------------------------------------------------------------- */

export const createMemoInputSchema = z.object({
  title: z.string().optional().describe("备忘录标题；不传则由系统自动生成"),
  content: z.string().describe("备忘录正文内容（MDX 格式）"),
  category: z
    .string()
    .optional()
    .describe("文件夹路径（如「工作/会议」）；不传则放根级"),
  tags: z
    .array(z.string())
    .optional()
    .describe("标签列表，便于检索"),
});

export const createMemoOutputSchema = writeResultOutputSchema;

export type CreateMemoInput = z.infer<typeof createMemoInputSchema>;
export type CreateMemoOutput = z.infer<typeof createMemoOutputSchema>;

/* -------------------------------------------------------------------------- */
/* update_memo：修改已有备忘录（写入，需用户确认）                                   */
/* -------------------------------------------------------------------------- */

export const updateMemoPatchSchema = z.object({
  title: z.string().optional().describe("新标题"),
  content: z.string().optional().describe("新正文（MDX 格式）"),
  category: z.string().optional().describe("新文件夹路径"),
  tags: z.array(z.string()).optional().describe("新标签列表"),
  pinned: z.boolean().optional().describe("是否置顶"),
});

export const updateMemoInputSchema = z.object({
  id: z.string().describe("目标备忘录节点 id"),
  patch: updateMemoPatchSchema.describe("要修改的字段子集"),
});

export const updateMemoOutputSchema = writeResultOutputSchema;

export type UpdateMemoInput = z.infer<typeof updateMemoInputSchema>;
export type UpdateMemoOutput = z.infer<typeof updateMemoOutputSchema>;

/* -------------------------------------------------------------------------- */
/* 写工具前缀常量                                                               */
/* -------------------------------------------------------------------------- */

/** 写工具统一前缀；chat/ 按前缀过滤、app/ 按前缀拦截 */
export const WRITE_TOOL_PREFIXES = ["create_", "update_"] as const;

export function isWriteTool(toolName: string): boolean {
  return WRITE_TOOL_PREFIXES.some((p) => toolName.startsWith(p));
}
