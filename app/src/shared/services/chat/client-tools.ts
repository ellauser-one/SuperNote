/**
 * [INPUT]: 依赖 @mastra/client-js createTool、zod、shared/services/api/memo.api
 *          getMemoTree（自带 JWT）、shared/stores/memo-tree.store（选中态数据源）、
 *          shared/types/memo、window.location（/app/notes/:noteId 选中路由）、
 *          features/agent-chat/tools/memo-write-tools（写入镜像工具）
 * [OUTPUT]: 对外提供 clientTools 镜像工具表与 findClientTool（AgentPanel onToolCall 消费）
 * [POS]: shared/services/chat 客户端工具层；与 chat/src/mastra/tools/schemas.ts
 *        同 id/schema 手工镜像，改动必须双向同步
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 铁律：
 * - 只回 CompactMemo（id/title/category/excerpt），禁止把 content_mdx 喂给模型
 * - execute 不向上抛业务错误：失败返回 { ok:false, error }，
 *   由 AgentPanel 显式 addToolResult 回灌（onToolCall 返回值会被 AI SDK 丢弃）
 * - search_memos 复用 GET /memo-tree（api 现有唯一列表读接口），本地过滤+裁剪
 * - 选中态真相源是路由 /app/notes/:noteId + memo-tree.store 已加载树
 */
import { createTool } from "@mastra/client-js";
import { z } from "zod";

import { findNode } from "../../lib/memo-tree-helpers";
import { useMemoTreeStore } from "../../stores/memo-tree.store";
import type { MemoTreeNode } from "../../types/memo";
import { getMemoTree } from "../api/memo.api";
import {
  createMemoTool,
  updateMemoTool,
} from "../../../features/agent-chat/tools/memo-write-tools";

/* -------------------------------------------------------------------------- */
/* schema（镜像 chat/src/mastra/tools/schemas.ts，禁止漂移）                      */
/* -------------------------------------------------------------------------- */

const compactMemoSchema = z.object({
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

type CompactMemo = z.infer<typeof compactMemoSchema>;

const searchMemosInputSchema = z.object({
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

const searchMemosOutputSchema = z.object({
  ok: z.boolean().describe("搜索是否执行成功"),
  memos: z
    .array(compactMemoSchema)
    .optional()
    .describe("命中的紧凑备忘录列表（按最近更新排序）；失败时缺省"),
  error: z.string().optional().describe("失败原因；成功时缺省"),
});

const readCurrentMemoInputSchema = z.object({});

const readCurrentMemoOutputSchema = z.object({
  ok: z.boolean().describe("是否读到当前选中的备忘录"),
  memo: compactMemoSchema
    .optional()
    .describe("当前选中备忘录的紧凑视图；未选中时缺省"),
  error: z
    .string()
    .optional()
    .describe("未选中或读取失败的原因；成功时缺省"),
});

type SearchMemosOutput = z.infer<typeof searchMemosOutputSchema>;
type ReadCurrentMemoOutput = z.infer<typeof readCurrentMemoOutputSchema>;

/* -------------------------------------------------------------------------- */
/* 树 → CompactMemo                                                             */
/* -------------------------------------------------------------------------- */

/** 前序遍历：memo 节点 + 祖先文件夹路径（根级为 null） */
function flattenMemoNodes(
  nodes: MemoTreeNode[],
  parentPath: string | null = null,
): Array<{ node: MemoTreeNode; category: string | null }> {
  const out: Array<{ node: MemoTreeNode; category: string | null }> = [];
  for (const node of nodes) {
    if (node.node_type === "memo") {
      out.push({ node, category: parentPath });
      continue;
    }
    const childPath = parentPath ? `${parentPath}/${node.title}` : node.title;
    out.push(...flattenMemoNodes(node.children, childPath));
  }
  return out;
}

/** 算单个 memo 的分类路径（读当前选中态用） */
function categoryOf(nodes: MemoTreeNode[], memoId: string): string | null {
  const hit = flattenMemoNodes(nodes).find(({ node }) => node.id === memoId);
  return hit ? hit.category : null;
}

function toCompactMemo(
  node: MemoTreeNode,
  category: string | null,
): CompactMemo {
  return {
    id: node.id,
    title: node.title,
    category,
    excerpt: node.memo?.excerpt ?? null,
  };
}

/** 从路由解析当前选中的 memo node id（选中态真相源是 URL） */
function readSelectedMemoId(): string | null {
  const match = /^\/app\/notes\/([^/]+)/.exec(window.location.pathname);
  return match?.[1] ?? null;
}

/* -------------------------------------------------------------------------- */
/* 镜像工具（与 chat/ 壳同 id；execute 在浏览器侧执行）                           */
/* -------------------------------------------------------------------------- */

const searchMemosTool = createTool({
  id: "search_memos",
  description:
    "搜索当前登录用户的备忘录，返回紧凑列表（id/标题/分类/摘要，无完整正文）。需要了解用户已有备忘录时调用。",
  inputSchema: searchMemosInputSchema,
  outputSchema: searchMemosOutputSchema,
  execute: async (inputData): Promise<SearchMemosOutput> => {
    try {
      const parsed = searchMemosInputSchema.safeParse(inputData);
      if (!parsed.success) {
        return {
          ok: false,
          error: `参数无效: ${parsed.error.issues[0]?.message ?? "未知"}`,
        };
      }
      const { query, category, limit } = parsed.data;

      // 读登录态调 api（getMemoTree 内部自带 JWT）；只取 compact 字段回模型
      const tree = await getMemoTree();
      const queryLc = query?.toLowerCase();
      const categoryLc = category?.toLowerCase();

      const memos = flattenMemoNodes(tree)
        .filter(({ node, category: path }) => {
          if (categoryLc && !(path ?? "").toLowerCase().includes(categoryLc)) {
            return false;
          }
          if (!queryLc) return true;
          return (
            node.title.toLowerCase().includes(queryLc) ||
            (node.memo?.excerpt ?? "").toLowerCase().includes(queryLc) ||
            (path ?? "").toLowerCase().includes(queryLc)
          );
        })
        .sort((a, b) => b.node.updated_at.localeCompare(a.node.updated_at))
        .slice(0, limit)
        .map(({ node, category: path }) => toCompactMemo(node, path));

      return { ok: true, memos };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "搜索备忘录失败",
      };
    }
  },
});

const readCurrentMemoTool = createTool({
  id: "read_current_memo",
  description:
    "读取用户当前在前端选中/打开的那条备忘录的紧凑视图。用户引用「当前这条」「这条备忘录」时先调用。",
  inputSchema: readCurrentMemoInputSchema,
  outputSchema: readCurrentMemoOutputSchema,
  execute: async (): Promise<ReadCurrentMemoOutput> => {
    try {
      const memoId = readSelectedMemoId();
      if (!memoId) {
        return { ok: false, error: "当前没有选中的备忘录" };
      }

      const nodes = useMemoTreeStore.getState().nodes;
      const node = findNode(nodes, memoId);
      if (!node || node.node_type !== "memo") {
        return { ok: false, error: "当前没有选中的备忘录" };
      }

      return {
        ok: true,
        memo: toCompactMemo(node, categoryOf(nodes, memoId)),
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "读取当前备忘录失败",
      };
    }
  },
});

/* -------------------------------------------------------------------------- */
/* 查找入口（onToolCall 按 toolName 查同名镜像工具）                              */
/* -------------------------------------------------------------------------- */

export const clientTools = {
  search_memos: searchMemosTool,
  read_current_memo: readCurrentMemoTool,
  create_memo: createMemoTool,
  update_memo: updateMemoTool,
} as const;

export type ClientToolName = keyof typeof clientTools;

/**
 * 按名查镜像工具，execute 收敛为统一签名。
 * 不同工具的 input 类型不同，此处把不安全断言收口在服务层，UI 侧保持类型干净。
 */
export function findClientTool(
  name: string,
): { execute: (input: unknown) => Promise<unknown> } | null {
  const tool = (clientTools as Record<string, unknown>)[name];
  if (!tool || typeof tool !== "object") return null;

  const execute = (tool as { execute?: unknown }).execute;
  if (typeof execute !== "function") return null;

  return {
    execute: (input) =>
      (
        execute as (
          i: unknown,
          context: Record<string, unknown>,
        ) => Promise<unknown>
      )(input, {}),
  };
}
