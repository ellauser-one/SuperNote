/**
 * [INPUT]: 依赖 memo-tree.store（renameNode / clearError / nodes）、
 *         react-router、shared/lib/memo-tree-helpers
 * [OUTPUT]: 对外提供 useMemoTreeActions hook（重命名 / 右键菜单 / 创建对话框状态）
 * [POS]: widgets/MemoTree 内部 hook；MemoTree 主组件消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { findNode } from "../../shared/lib/memo-tree-helpers";
import { useMemoTreeStore } from "../../shared/stores/memo-tree.store";
import type { MemoTreeNode as NodeType } from "../../shared/types/memo";
import type { ContextMenuAction } from "./MemoTreeContextMenu";

/* -------------------------------------------------------------------------- */
/* Types                                                                        */
/* -------------------------------------------------------------------------- */

export type ContextMenuState = {
  x: number;
  y: number;
  /** 新建节点的 parent（folder 上右键 = 该 folder；memo 上 = 其 parent） */
  targetParentId: string | null;
  /** 被右键的节点 id；有值时可重命名 */
  targetNodeId: string | null;
  /** 被右键节点的当前标题（进入重命名时用） */
  targetTitle: string | null;
};

export type CreateDialogState = {
  type: "folder" | "memo";
  parentId: string | null;
};

export type MemoTreeActionsReturn = {
  renamingId: string | null;
  renameValue: string;
  contextMenu: ContextMenuState | null;
  createDialog: CreateDialogState | null;
  setRenameValue: (v: string) => void;
  setContextMenu: (v: ContextMenuState | null) => void;
  setCreateDialog: (v: CreateDialogState | null) => void;
  handleDoubleClick: (node: NodeType) => void;
  commitRename: () => Promise<void>;
  cancelRename: () => void;
  handleContextMenu: (
    e: React.MouseEvent,
    opts: { parentId: string | null; nodeId?: string | null; title?: string | null },
  ) => void;
  handleContextAction: (action: ContextMenuAction) => void;
  openCreate: (type: "folder" | "memo", parentId?: string | null) => void;
  handleCreated: (nodeId: string) => void;
};

/* -------------------------------------------------------------------------- */
/* Hook                                                                         */
/* -------------------------------------------------------------------------- */

export function useMemoTreeActions(
  expandFolder: (id: string) => void,
  onMemoOpened?: (nodeId: string) => void,
): MemoTreeActionsReturn {
  const lastError = useMemoTreeStore((s) => s.lastError);
  const renameNode = useMemoTreeStore((s) => s.renameNode);
  const clearError = useMemoTreeStore((s) => s.clearError);
  const navigate = useNavigate();

  /* ── 重命名 ────────────────────────────────────────────────── */
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  /* ── 右键菜单 ──────────────────────────────────────────────── */
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  /* ── 创建对话框 ────────────────────────────────────────────── */
  const [createDialog, setCreateDialog] = useState<CreateDialogState | null>(null);

  /* ── toast 自动消失 ────────────────────────────────────────── */
  useEffect(() => {
    if (!lastError) return;
    const t = window.setTimeout(() => clearError(), 4000);
    return () => window.clearTimeout(t);
  }, [lastError, clearError]);

  /* ── 重命名 handlers ───────────────────────────────────────── */
  const handleDoubleClick = useCallback((node: NodeType) => {
    setRenamingId(node.id);
    setRenameValue(node.title);
  }, []);

  const commitRename = useCallback(async () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (trimmed) {
      try {
        await renameNode(renamingId, trimmed);
      } catch {
        /* store 回滚 + lastError */
      }
    }
    setRenamingId(null);
    setRenameValue("");
  }, [renamingId, renameValue, renameNode]);

  const cancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameValue("");
  }, []);

  /* ── 右键 handlers ─────────────────────────────────────────── */
  const handleContextMenu = useCallback(
    (
      e: React.MouseEvent,
      opts: {
        parentId: string | null;
        nodeId?: string | null;
        title?: string | null;
      },
    ) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        targetParentId: opts.parentId,
        targetNodeId: opts.nodeId ?? null,
        targetTitle: opts.title ?? null,
      });
    },
    [],
  );

  const handleContextAction = useCallback(
    (action: ContextMenuAction) => {
      if (action === "rename") {
        const id = contextMenu?.targetNodeId;
        if (!id) return;
        setRenamingId(id);
        setRenameValue(contextMenu?.targetTitle ?? "");
        return;
      }
      const parentId = contextMenu?.targetParentId ?? null;
      setCreateDialog({
        type: action === "create-folder" ? "folder" : "memo",
        parentId,
      });
    },
    [contextMenu],
  );

  /* ── 创建 ──────────────────────────────────────────────────── */
  const openCreate = useCallback(
    (type: "folder" | "memo", parentId: string | null = null) => {
      setCreateDialog({ type, parentId });
    },
    [],
  );

  const handleCreated = useCallback(
    (nodeId: string) => {
      const node = findNode(useMemoTreeStore.getState().nodes, nodeId);
      if (node?.node_type === "memo") {
        onMemoOpened?.(nodeId);
        navigate(`/app/notes/${nodeId}`);
      }
      if (node?.parent_id) {
        expandFolder(node.parent_id);
      }
    },
    [navigate, expandFolder, onMemoOpened],
  );

  return {
    renamingId,
    renameValue,
    contextMenu,
    createDialog,
    setRenameValue,
    setContextMenu,
    setCreateDialog,
    handleDoubleClick,
    commitRename,
    cancelRename,
    handleContextMenu,
    handleContextAction,
    openCreate,
    handleCreated,
  };
}
