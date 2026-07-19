import { z } from 'zod';

const compactMemoSchema = z.object({
  id: z.string().describe("\u5907\u5FD8\u5F55\u8282\u70B9 id\uFF08memo_nodes.id\uFF09"),
  title: z.string().describe("\u5907\u5FD8\u5F55\u6807\u9898"),
  category: z.string().nullable().describe("\u6240\u5728\u6587\u4EF6\u5939\u8DEF\u5F84\uFF08\u5982\u300C\u5DE5\u4F5C/\u4F1A\u8BAE\u300D\uFF09\uFF1B\u6839\u7EA7\u5907\u5FD8\u5F55\u4E3A null"),
  excerpt: z.string().nullable().describe("\u6B63\u6587\u6458\u8981\uFF08\u670D\u52A1\u7AEF\u622A\u53D6\u7684\u524D 200 \u5B57\uFF0C\u975E\u5168\u6587\uFF09\uFF1B\u7A7A\u6B63\u6587\u4E3A null")
});
const searchMemosInputSchema = z.object({
  query: z.string().min(1).optional().describe("\u641C\u7D22\u5173\u952E\u8BCD\uFF0C\u5339\u914D\u6807\u9898\u3001\u6458\u8981\u3001\u5206\u7C7B\u8DEF\u5F84\uFF1B\u4E0D\u4F20\u5219\u6309\u6700\u8FD1\u66F4\u65B0\u5217\u51FA"),
  category: z.string().min(1).optional().describe("\u6309\u6587\u4EF6\u5939\u8DEF\u5F84\u8FC7\u6EE4\uFF08\u5982\u300C\u5DE5\u4F5C\u300D\uFF09\uFF0C\u53EF\u4E0E query \u53E0\u52A0"),
  limit: z.number().int().min(1).max(20).default(10).describe("\u8FD4\u56DE\u6761\u6570\u4E0A\u9650\uFF0C\u9ED8\u8BA4 10\uFF0C\u6700\u5927 20")
});
const searchMemosOutputSchema = z.object({
  ok: z.boolean().describe("\u641C\u7D22\u662F\u5426\u6267\u884C\u6210\u529F"),
  memos: z.array(compactMemoSchema).optional().describe("\u547D\u4E2D\u7684\u7D27\u51D1\u5907\u5FD8\u5F55\u5217\u8868\uFF08\u6309\u6700\u8FD1\u66F4\u65B0\u6392\u5E8F\uFF09\uFF1B\u5931\u8D25\u65F6\u7F3A\u7701"),
  error: z.string().optional().describe("\u5931\u8D25\u539F\u56E0\uFF1B\u6210\u529F\u65F6\u7F3A\u7701")
});
const readCurrentMemoInputSchema = z.object({});
const readCurrentMemoOutputSchema = z.object({
  ok: z.boolean().describe("\u662F\u5426\u8BFB\u5230\u5F53\u524D\u9009\u4E2D\u7684\u5907\u5FD8\u5F55"),
  memo: compactMemoSchema.optional().describe("\u5F53\u524D\u9009\u4E2D\u5907\u5FD8\u5F55\u7684\u7D27\u51D1\u89C6\u56FE\uFF1B\u672A\u9009\u4E2D\u65F6\u7F3A\u7701"),
  error: z.string().optional().describe("\u672A\u9009\u4E2D\u6216\u8BFB\u53D6\u5931\u8D25\u7684\u539F\u56E0\uFF1B\u6210\u529F\u65F6\u7F3A\u7701")
});
const writeResultMemoSchema = z.object({
  id: z.string().describe("\u5907\u5FD8\u5F55\u8282\u70B9 id"),
  title: z.string().describe("\u5907\u5FD8\u5F55\u6807\u9898"),
  category: z.string().nullable().describe("\u6240\u5728\u6587\u4EF6\u5939\u8DEF\u5F84\uFF1B\u6839\u7EA7\u4E3A null"),
  updated_at: z.string().describe("\u66F4\u65B0\u65F6\u95F4\u6233")
});
const writeResultOutputSchema = z.object({
  ok: z.boolean().describe("\u5199\u5165\u662F\u5426\u6210\u529F"),
  memo: writeResultMemoSchema.optional().describe("\u6210\u529F\u65F6\u8FD4\u56DE\u7684\u5907\u5FD8\u5F55\u6458\u8981\uFF1B\u5931\u8D25\u65F6\u7F3A\u7701"),
  error: z.string().optional().describe("\u5931\u8D25\u539F\u56E0\uFF08user_rejected / \u53EA\u8BFB / \u7F51\u7EDC\u7B49\uFF09\uFF1B\u6210\u529F\u65F6\u7F3A\u7701")
});
const createMemoInputSchema = z.object({
  title: z.string().optional().describe("\u5907\u5FD8\u5F55\u6807\u9898\uFF1B\u4E0D\u4F20\u5219\u7531\u7CFB\u7EDF\u81EA\u52A8\u751F\u6210"),
  content: z.string().describe("\u5907\u5FD8\u5F55\u6B63\u6587\u5185\u5BB9\uFF08MDX \u683C\u5F0F\uFF09"),
  category: z.string().optional().describe("\u6587\u4EF6\u5939\u8DEF\u5F84\uFF08\u5982\u300C\u5DE5\u4F5C/\u4F1A\u8BAE\u300D\uFF09\uFF1B\u4E0D\u4F20\u5219\u653E\u6839\u7EA7"),
  tags: z.array(z.string()).optional().describe("\u6807\u7B7E\u5217\u8868\uFF0C\u4FBF\u4E8E\u68C0\u7D22")
});
const createMemoOutputSchema = writeResultOutputSchema;
const updateMemoPatchSchema = z.object({
  title: z.string().optional().describe("\u65B0\u6807\u9898"),
  content: z.string().optional().describe("\u65B0\u6B63\u6587\uFF08MDX \u683C\u5F0F\uFF09"),
  category: z.string().optional().describe("\u65B0\u6587\u4EF6\u5939\u8DEF\u5F84"),
  tags: z.array(z.string()).optional().describe("\u65B0\u6807\u7B7E\u5217\u8868"),
  pinned: z.boolean().optional().describe("\u662F\u5426\u7F6E\u9876")
});
const updateMemoInputSchema = z.object({
  id: z.string().describe("\u76EE\u6807\u5907\u5FD8\u5F55\u8282\u70B9 id"),
  patch: updateMemoPatchSchema.describe("\u8981\u4FEE\u6539\u7684\u5B57\u6BB5\u5B50\u96C6")
});
const updateMemoOutputSchema = writeResultOutputSchema;
const WRITE_TOOL_PREFIXES = ["create_", "update_"];
function isWriteTool(toolName) {
  return WRITE_TOOL_PREFIXES.some((p) => toolName.startsWith(p));
}

export { WRITE_TOOL_PREFIXES, compactMemoSchema, createMemoInputSchema, createMemoOutputSchema, isWriteTool, readCurrentMemoInputSchema, readCurrentMemoOutputSchema, searchMemosInputSchema, searchMemosOutputSchema, updateMemoInputSchema, updateMemoOutputSchema, updateMemoPatchSchema, writeResultMemoSchema, writeResultOutputSchema };
