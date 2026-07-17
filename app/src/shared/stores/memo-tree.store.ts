/**
 * [INPUT]: 依赖 zustand create，依赖 shared/services/api/memo.api 与 shared/lib/memo-tree-helpers
 * [OUTPUT]: 对外提供 useMemoTreeStore hook 与 MemoTreeState 类型
 * [POS]: shared/stores 备忘录树全局状态；widgets/MemoTree 唯一数据源
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 规则：
 * - fetchTree 仅在进入 dashboard、登录用户变化、显式刷新时调用
 * - create / rename / move 均乐观更新；失败回滚 previousNodes
 * - move 成功后禁止重新 GET /memo-tree，避免 UI 闪动
 */
import { create } from "zustand";

import {
  createMemo as apiCreateMemo,
  createMemoFolder as apiCreateFolder,
  getMemoTree,
  moveMemoNode as apiMoveMemoNode,
  updateMemo as apiUpdateMemo,
  updateMemoNode as apiUpdateMemoNode,
} from "../services/api/memo.api";
import {
  computeSortOrder,
  findNode,
  findSiblings,
  insertNode,
  moveNodeInTree,
  replaceNode,
  sortNodes,
  updateNode,
} from "../lib/memo-tree-helpers";
import type {
  CreateMemoFolderInput,
  CreateMemoInput,
  MemoTreeNode,
  MoveMemoNodeInput,
} from "../types/memo";

/* -------------------------------------------------------------------------- */
/* 乐观 ID（create 本地占位；成功后用服务端 id 替换）                               */
/* -------------------------------------------------------------------------- */

let optimisticCounter = 0;
function nextOptimisticId(): string {
  return `__optimistic_${++optimisticCounter}_${Date.now()}`;
}

/* -------------------------------------------------------------------------- */
/* Store 类型                                                                   */
/* -------------------------------------------------------------------------- */

export type MemoTreeState = {
  loading: boolean;
  nodes: MemoTreeNode[];
  /** 最近一次树操作错误（供 UI toast） */
  lastError: string | null;

  fetchTree(signal?: AbortSignal): Promise<MemoTreeNode[]>;
  createFolder(input: CreateMemoFolderInput): Promise<MemoTreeNode>;
  createMemo(input: CreateMemoInput): Promise<MemoTreeNode>;
  /**
   * 拖拽移动：本地先 remove + insert，再 PATCH move。
   * 成功不 refetch；失败回滚 previousNodes。
   */
  moveNode(nodeId: string, input: MoveMemoNodeInput): Promise<void>;
  renameNode(nodeId: string, title: string): Promise<MemoTreeNode>;
  updateMemoContentLocal(nodeId: string, content: string): void;
  saveMemoContent(nodeId: string, content: string): Promise<MemoTreeNode>;
  clearError(): void;
  reset(): void;
};

/* -------------------------------------------------------------------------- */
/* Store                                                                        */
/* -------------------------------------------------------------------------- */

export const useMemoTreeStore = create<MemoTreeState>((set, get) => ({
  loading: false,
  nodes: [],
  lastError: null,

  /* ── fetchTree ─────────────────────────────────────────────── */

  async fetchTree(signal) {
    set({ loading: true, lastError: null });
    try {
      const tree = await getMemoTree(signal);
      set({ nodes: sortNodes(tree), loading: false });
      return tree;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  /* ── createFolder ──────────────────────────────────────────── */

  async createFolder(input) {
    const previousNodes = get().nodes;
    const optimisticId = nextOptimisticId();

    const optimisticNode: MemoTreeNode = {
      id: optimisticId,
      user_id: "",
      parent_id: input.parent_id,
      node_type: "folder",
      title: input.title,
      sort_order: computeSortOrder(
        findSiblings(previousNodes, input.parent_id),
        "append",
      ),
      icon: null,
      color: null,
      metadata: {},
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      children: [],
      memo: null,
    };

    set({
      nodes: insertNode(previousNodes, optimisticNode, input.parent_id),
      lastError: null,
    });

    try {
      const real = await apiCreateFolder(input);
      set((s) => ({
        nodes: replaceNode(s.nodes, optimisticId, real),
      }));
      return real;
    } catch (err) {
      set({
        nodes: previousNodes,
        lastError: err instanceof Error ? err.message : "创建文件夹失败",
      });
      throw err;
    }
  },

  /* ── createMemo ────────────────────────────────────────────── */

  async createMemo(input) {
    const previousNodes = get().nodes;
    const optimisticId = nextOptimisticId();
    const siblings = findSiblings(previousNodes, input.parent_id);
    const sortOrder =
      input.sort_order != null
        ? String(input.sort_order)
        : computeSortOrder(siblings, "append");

    const optimisticNode: MemoTreeNode = {
      id: optimisticId,
      user_id: "",
      parent_id: input.parent_id,
      node_type: "memo",
      title: input.title,
      sort_order: sortOrder,
      icon: null,
      color: null,
      metadata: {},
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      children: [],
      memo: {
        node_id: optimisticId,
        user_id: "",
        content_mdx: input.content_mdx ?? "",
        excerpt: null,
        word_count: 0,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    set({
      nodes: insertNode(
        previousNodes,
        optimisticNode,
        input.parent_id,
        sortOrder,
      ),
      lastError: null,
    });

    try {
      const real = await apiCreateMemo(input);
      set((s) => ({
        nodes: replaceNode(s.nodes, optimisticId, real),
      }));
      return real;
    } catch (err) {
      set({
        nodes: previousNodes,
        lastError: err instanceof Error ? err.message : "创建备忘录失败",
      });
      throw err;
    }
  },

  /* ── moveNode（乐观更新；成功不 refetch） ───────────────────── */

  async moveNode(nodeId, input) {
    const previousNodes = get().nodes;
    if (!findNode(previousNodes, nodeId)) return;

    const sortOrder = String(input.sort_order);

    set({
      nodes: moveNodeInTree(
        previousNodes,
        nodeId,
        input.parent_id,
        sortOrder,
      ),
      lastError: null,
    });

    try {
      await apiMoveMemoNode(nodeId, {
        parent_id: input.parent_id,
        sort_order: input.sort_order,
      });
      // 成功：保留乐观树，禁止整树 refetch
    } catch (err) {
      set({
        nodes: previousNodes,
        lastError: err instanceof Error ? err.message : "移动节点失败",
      });
      throw err;
    }
  },

  /* ── renameNode ────────────────────────────────────────────── */

  async renameNode(nodeId, title) {
    const previousNodes = get().nodes;

    set({
      nodes: updateNode(previousNodes, nodeId, (n) => ({
        ...n,
        title,
      })),
      lastError: null,
    });

    try {
      const real = await apiUpdateMemoNode(nodeId, { title });
      set((s) => ({
        nodes: replaceNode(s.nodes, nodeId, real, true),
      }));
      return real;
    } catch (err) {
      set({
        nodes: previousNodes,
        lastError: err instanceof Error ? err.message : "重命名失败",
      });
      throw err;
    }
  },

  /* ── updateMemoContentLocal ────────────────────────────────── */

  updateMemoContentLocal(nodeId, content) {
    set((s) => ({
      nodes: updateNode(s.nodes, nodeId, (n) => ({
        ...n,
        memo: n.memo
          ? {
              ...n.memo,
              content_mdx: content,
              updated_at: new Date().toISOString(),
            }
          : n.memo,
      })),
    }));
  },

  /* ── saveMemoContent ───────────────────────────────────────── */
  /**
   * 将 content 原样 POST 到 PATCH /memos/:id（不 trim、不压缩空格）。
   * 竞态：若请求期间用户继续输入，本地 content_mdx 已更新为更新内容；
   * 此时旧响应返回时 currentContent !== content，禁止用旧服务端节点覆盖本地。
   */

  async saveMemoContent(nodeId, content) {
    try {
      const real = await apiUpdateMemo(nodeId, { content_mdx: content });
      set((s) => {
        const current = findNode(s.nodes, nodeId);
        const currentContent = current?.memo?.content_mdx;

        // 本地已前进到更新草稿：丢弃过期响应，保留用户输入
        if (currentContent != null && currentContent !== content) {
          return { nodes: s.nodes };
        }

        return { nodes: replaceNode(s.nodes, nodeId, real, true) };
      });
      return real;
    } catch (err) {
      // 失败不回滚本地 content_mdx，避免丢字
      set({
        lastError: err instanceof Error ? err.message : "保存备忘录失败",
      });
      throw err;
    }
  },

  clearError() {
    set({ lastError: null });
  },

  reset() {
    set({ loading: false, nodes: [], lastError: null });
  },
}));
