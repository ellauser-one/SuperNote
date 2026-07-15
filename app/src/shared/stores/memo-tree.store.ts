/**
 * [INPUT]: 依赖 zustand create，依赖 shared/services/api/memo.api 与 shared/lib/memo-tree-helpers
 * [OUTPUT]: 对外提供 useMemoTreeStore hook 与 MemoTreeState 类型
 * [POS]: shared/stores 备忘录树全局状态；widgets/MemoTree 唯一数据源
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
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
  removeNode,
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
/* 乐观 ID                                                                     */
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

  fetchTree(signal?: AbortSignal): Promise<MemoTreeNode[]>;
  createFolder(input: CreateMemoFolderInput): Promise<MemoTreeNode>;
  createMemo(input: CreateMemoInput): Promise<MemoTreeNode>;
  moveNode(
    nodeId: string,
    input: MoveMemoNodeInput,
    /** 可选：前端已算好的 sort_order，跳过本地再算 */
    precomputedSortOrder?: string,
  ): Promise<void>;
  renameNode(nodeId: string, title: string): Promise<MemoTreeNode>;
  /** 编辑器调用：本地即时更新正文，不触发 API */
  updateMemoContentLocal(nodeId: string, content: string): void;
  saveMemoContent(
    nodeId: string,
    content: string,
  ): Promise<MemoTreeNode>;
  reset(): void;
};

/* -------------------------------------------------------------------------- */
/* Store                                                                        */
/* -------------------------------------------------------------------------- */

export const useMemoTreeStore = create<MemoTreeState>((set, get) => ({
  loading: false,
  nodes: [],

  /* ── fetchTree ─────────────────────────────────────────────── */

  async fetchTree(signal) {
    set({ loading: true });
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
    });

    try {
      const real = await apiCreateFolder(input);
      set((s) => ({
        nodes: replaceNode(s.nodes, optimisticId, real),
      }));
      return real;
    } catch (err) {
      set({ nodes: previousNodes });
      throw err;
    }
  },

  /* ── createMemo ────────────────────────────────────────────── */

  async createMemo(input) {
    const previousNodes = get().nodes;
    const optimisticId = nextOptimisticId();
    const siblings = findSiblings(previousNodes, input.parent_id);

    const optimisticNode: MemoTreeNode = {
      id: optimisticId,
      user_id: "",
      parent_id: input.parent_id,
      node_type: "memo",
      title: input.title,
      sort_order:
        input.sort_order ??
        computeSortOrder(siblings, "append"),
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
        input.sort_order,
      ),
    });

    try {
      const real = await apiCreateMemo(input);
      set((s) => ({
        nodes: replaceNode(s.nodes, optimisticId, real),
      }));
      return real;
    } catch (err) {
      set({ nodes: previousNodes });
      throw err;
    }
  },

  /* ── moveNode ──────────────────────────────────────────────── */

  async moveNode(nodeId, input, precomputedSortOrder) {
    const previousNodes = get().nodes;
    const sortOrder =
      precomputedSortOrder ?? input.sort_order;

    set({
      nodes: moveNodeInTree(
        previousNodes,
        nodeId,
        input.parent_id,
        sortOrder,
      ),
    });

    try {
      await apiMoveMemoNode(nodeId, input);
      // 成功后不重新 fetch，本地已经是最新
    } catch (err) {
      set({ nodes: previousNodes });
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
    });

    try {
      const real = await apiUpdateMemoNode(nodeId, { title });
      set((s) => ({
        nodes: replaceNode(s.nodes, nodeId, real, true),
      }));
      return real;
    } catch (err) {
      set({ nodes: previousNodes });
      throw err;
    }
  },

  /* ── updateMemoContentLocal ────────────────────────────────── */

  updateMemoContentLocal(nodeId, content) {
    set((s) => ({
      nodes: updateNode(s.nodes, nodeId, (n) => ({
        ...n,
        memo: n.memo
          ? { ...n.memo, content_mdx: content, updated_at: new Date().toISOString() }
          : n.memo,
      })),
    }));
  },

  /* ── saveMemoContent ───────────────────────────────────────── */

  async saveMemoContent(nodeId, content) {
    try {
      const real = await apiUpdateMemo(nodeId, { content_mdx: content });
      set((s) => {
        const current = findNode(s.nodes, nodeId);
        const currentContent = current?.memo?.content_mdx;

        // 用户仍在编辑且内容已变化 → 不覆盖
        if (currentContent != null && currentContent !== content) {
          return { nodes: s.nodes };
        }

        return { nodes: replaceNode(s.nodes, nodeId, real, true) };
      });
      return real;
    } catch (err) {
      // 保存失败不回滚内容（用户可能继续编辑）
      throw err;
    }
  },

  /* ── reset ─────────────────────────────────────────────────── */

  reset() {
    set({ loading: false, nodes: [] });
  },
}));
