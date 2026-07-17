/**
 * [INPUT]: 依赖 @mastra/client-js createTool、zod、shared/services/api/memo.api
 *          (createMemo / updateMemo)、shared/stores/memo-tree.store (fetchTree)
 * [OUTPUT]: 对外提供 createMemoTool / updateMemoTool（写入镜像工具，带 execute）、
 *           WRITE_TOOL_PREFIXES / isWriteTool（写工具前缀常量与判断）、
 *           ConfirmationStore（写入前用户确认 promise store）
 * [POS]: features/agent-chat/tools 写工具层；与 chat/src/mastra/tools/schemas.ts
 *        同 id/schema 手工镜像，改动必须双向同步
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 铁律：
 * - create_/update_ 前缀约定：app/ 侧 onToolCall 按前缀做第二道写权拦截
 * - 写入前必须经 ConfirmationStore 弹确认卡，用户确认后才调 api
 * - execute 不向上抛业务错误：失败返回 { ok:false, error }，
 *   由 AgentPanel 显式 addToolResult 回灌
 * - 不记录 Authorization / token 到任何日志
 */
import { createTool } from "@mastra/client-js";
import { z } from "zod";

import {
  createMemo as apiCreateMemo,
  updateMemo as apiUpdateMemo,
} from "../../../shared/services/api/memo.api";
import { useMemoTreeStore } from "../../../shared/stores/memo-tree.store";

/* -------------------------------------------------------------------------- */
/* 写工具前缀常量（与 chat/src/mastra/tools/schemas.ts 保持一致）                  */
/* -------------------------------------------------------------------------- */

export const WRITE_TOOL_PREFIXES = ["create_", "update_"] as const;

export function isWriteTool(toolName: string): boolean {
  return WRITE_TOOL_PREFIXES.some((p) => toolName.startsWith(p));
}

/* -------------------------------------------------------------------------- */
/* 确认 Store：写入前暂停等用户确认                                               */
/* -------------------------------------------------------------------------- */

export type PendingConfirmation = {
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
  resolve: (confirmed: boolean) => void;
};

/**
 * 模块级 promise store：tool execute 在此 await，React 组件在此 resolve。
 * 不用 zustand —— 避免不必要的重渲染，只需一个悬挂 promise。
 */
export const ConfirmationStore = {
  _pending: null as PendingConfirmation | null,
  _listeners: [] as Array<() => void>,

  _notify(): void {
    for (const l of this._listeners) l();
  },

  /** React 组件订阅变更（返回取消订阅函数） */
  subscribe(listener: () => void): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  },

  request(
    toolCallId: string,
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this._pending = { toolCallId, toolName, input, resolve };
      this._notify();
    });
  },

  confirm(): void {
    this._pending?.resolve(true);
    this._pending = null;
    this._notify();
  },

  reject(): void {
    this._pending?.resolve(false);
    this._pending = null;
    this._notify();
  },

  get pending(): PendingConfirmation | null {
    return this._pending;
  },
};

/* -------------------------------------------------------------------------- */
/* schema（镜像 chat/src/mastra/tools/schemas.ts，禁止漂移）                      */
/* -------------------------------------------------------------------------- */

const writeResultMemoSchema = z.object({
  id: z.string().describe("备忘录节点 id"),
  title: z.string().describe("备忘录标题"),
  category: z
    .string()
    .nullable()
    .describe("所在文件夹路径；根级为 null"),
  updated_at: z.string().describe("更新时间戳"),
});

const writeResultOutputSchema = z.object({
  ok: z.boolean().describe("写入是否成功"),
  memo: writeResultMemoSchema
    .optional()
    .describe("成功时返回的备忘录摘要；失败时缺省"),
  error: z
    .string()
    .optional()
    .describe("失败原因（user_rejected / 只读 / 网络等）；成功时缺省"),
});

type WriteResultOutput = z.infer<typeof writeResultOutputSchema>;

const createMemoInputSchema = z.object({
  title: z
    .string()
    .optional()
    .describe("备忘录标题；不传则由系统自动生成"),
  content: z.string().describe("备忘录正文内容（MDX 格式）"),
  category: z
    .string()
    .optional()
    .describe("文件夹路径（如「工作/会议」）；不传则放根级"),
  tags: z.array(z.string()).optional().describe("标签列表，便于检索"),
});

const updateMemoPatchSchema = z.object({
  title: z.string().optional().describe("新标题"),
  content: z.string().optional().describe("新正文（MDX 格式）"),
  category: z.string().optional().describe("新文件夹路径"),
  tags: z.array(z.string()).optional().describe("新标签列表"),
  pinned: z.boolean().optional().describe("是否置顶"),
});

const updateMemoInputSchema = z.object({
  id: z.string().describe("目标备忘录节点 id"),
  patch: updateMemoPatchSchema.describe("要修改的字段子集"),
});

/* -------------------------------------------------------------------------- */
/* 镜像工具（与 chat/ 壳同 id；execute 在浏览器侧执行）                           */
/* -------------------------------------------------------------------------- */

export const createMemoTool = createTool({
  id: "create_memo",
  description:
    "创建新备忘录。前端会弹出确认卡，用户确认后才真正写入。必须先调 search_memos 确认无重复。",
  inputSchema: createMemoInputSchema,
  outputSchema: writeResultOutputSchema,
  execute: async (
    inputData,
    context,
  ): Promise<WriteResultOutput> => {
    try {
      const parsed = createMemoInputSchema.safeParse(inputData);
      if (!parsed.success) {
        return {
          ok: false,
          error: `参数无效: ${parsed.error.issues[0]?.message ?? "未知"}`,
        };
      }

      // 写入前用户确认
      const confirmed = await ConfirmationStore.request(
        (context as { toolCallId?: string }).toolCallId ?? "unknown",
        "create_memo",
        parsed.data as Record<string, unknown>,
      );
      if (!confirmed) {
        return { ok: false, error: "user_rejected" };
      }

      const { title, content, tags } = parsed.data;
      const node = await apiCreateMemo({
        parent_id: null, // 本轮创建默认放根级；category → parent_id 后续迭代
        title: title ?? "新备忘录",
        content_mdx: content,
      });

      // 刷新树让列表立即显示
      await useMemoTreeStore.getState().fetchTree();

      return {
        ok: true,
        memo: {
          id: node.id,
          title: node.title,
          category: null,
          updated_at: node.updated_at,
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "创建备忘录失败",
      };
    }
  },
});

export const updateMemoTool = createTool({
  id: "update_memo",
  description:
    "修改已有备忘录的标题、正文、分类、标签或置顶状态。前端会弹出确认卡，用户确认后才真正写入。",
  inputSchema: updateMemoInputSchema,
  outputSchema: writeResultOutputSchema,
  execute: async (
    inputData,
    context,
  ): Promise<WriteResultOutput> => {
    try {
      const parsed = updateMemoInputSchema.safeParse(inputData);
      if (!parsed.success) {
        return {
          ok: false,
          error: `参数无效: ${parsed.error.issues[0]?.message ?? "未知"}`,
        };
      }

      // 写入前用户确认
      const confirmed = await ConfirmationStore.request(
        (context as { toolCallId?: string }).toolCallId ?? "unknown",
        "update_memo",
        parsed.data as Record<string, unknown>,
      );
      if (!confirmed) {
        return { ok: false, error: "user_rejected" };
      }

      const { id, patch } = parsed.data;

      // 构造 API 更新参数（当前 api 只支持 title + content_mdx）
      const apiInput: { title?: string; content_mdx?: string } = {};
      if (patch.title !== undefined) apiInput.title = patch.title;
      if (patch.content !== undefined) apiInput.content_mdx = patch.content;

      const node = await apiUpdateMemo(id, apiInput);

      // 刷新树让列表立即反映变更
      await useMemoTreeStore.getState().fetchTree();

      return {
        ok: true,
        memo: {
          id: node.id,
          title: node.title,
          category: null,
          updated_at: node.updated_at,
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "更新备忘录失败",
      };
    }
  },
});
