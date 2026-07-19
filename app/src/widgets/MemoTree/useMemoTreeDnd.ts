/**
 * [INPUT]: 依赖 memo-tree.store（nodes / moveNode）、shared/lib/memo-tree-helpers、
 *         useFlipAnimation、React DragEvent
 * [OUTPUT]: 对外提供 useMemoTreeDnd hook（拖拽态 + 编排 + FLIP 动画）
 * [POS]: widgets/MemoTree 内部 hook；MemoTree 主组件消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useCallback, useRef, useState, type DragEvent, type RefObject } from "react";

import {
  canDropTarget,
  findNode,
  resolveDropPlacement,
} from "../../shared/lib/memo-tree-helpers";
import { useMemoTreeStore } from "../../shared/stores/memo-tree.store";
import type {
  DropPosition,
  DropTarget,
  MemoTreeNode as NodeType,
} from "../../shared/types/memo";
import { useFlipAnimation } from "./useFlipAnimation";

/* -------------------------------------------------------------------------- */
/* Constants                                                                    */
/* -------------------------------------------------------------------------- */

export const DRAG_TYPE = "application/x-supernote-node-id";
const FOLDER_BEFORE = 0.24;
const FOLDER_AFTER = 0.76;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                      */
/* -------------------------------------------------------------------------- */

function sameDropTarget(a: DropTarget | null, b: DropTarget | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.nodeId === b.nodeId &&
    a.parentId === b.parentId &&
    a.position === b.position
  );
}

/* -------------------------------------------------------------------------- */
/* Hook return type                                                             */
/* -------------------------------------------------------------------------- */

export type MemoTreeDndReturn = {
  dragSourceId: string | null;
  dropTarget: DropTarget | null;
  draggingBusy: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  resetDrag: () => void;
  proposeDropTarget: (next: DropTarget) => void;
  handleDragStart: (e: DragEvent, nodeId: string) => void;
  handleDragEnd: () => void;
  zoneFromFolderRow: (e: DragEvent) => DropPosition;
  zoneFromMemoRow: (e: DragEvent) => DropPosition;
  handleDropWithTarget: (e: DragEvent, target: DropTarget) => void;
  rootEndTarget: DropTarget;
};

/* -------------------------------------------------------------------------- */
/* Hook                                                                         */
/* -------------------------------------------------------------------------- */

export function useMemoTreeDnd(expandFolder: (id: string) => void): MemoTreeDndReturn {
  const nodes = useMemoTreeStore((s) => s.nodes);
  const moveNode = useMemoTreeStore((s) => s.moveNode);
  const containerRef = useRef<HTMLDivElement>(null);
  const flip = useFlipAnimation();

  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [draggingBusy, setDraggingBusy] = useState(false);

  const resetDrag = useCallback(() => {
    setDragSourceId(null);
    setDropTarget(null);
  }, []);

  const proposeDropTarget = useCallback(
    (next: DropTarget) => {
      if (!dragSourceId) {
        setDropTarget(null);
        return;
      }
      if (!canDropTarget(nodes, dragSourceId, next)) {
        setDropTarget(null);
        return;
      }
      setDropTarget((prev) => (sameDropTarget(prev, next) ? prev : next));
    },
    [dragSourceId, nodes],
  );

  const handleDragStart = useCallback((e: DragEvent, nodeId: string) => {
    setDragSourceId(nodeId);
    setDropTarget(null);
    e.dataTransfer.setData(DRAG_TYPE, nodeId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragEnd = useCallback(() => {
    resetDrag();
  }, [resetDrag]);

  const zoneFromFolderRow = useCallback((e: DragEvent): DropPosition => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / Math.max(rect.height, 1);
    if (ratio < FOLDER_BEFORE) return "before";
    if (ratio > FOLDER_AFTER) return "after";
    return "inside";
  }, []);

  const zoneFromMemoRow = useCallback((e: DragEvent): DropPosition => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / Math.max(rect.height, 1);
    return ratio < 0.5 ? "before" : "after";
  }, []);

  const commitDrop = useCallback(
    async (sourceId: string, target: DropTarget) => {
      if (!canDropTarget(nodes, sourceId, target)) {
        resetDrag();
        return;
      }

      const payload = resolveDropPlacement(nodes, sourceId, target);

      // 无实际变化时跳过
      const current = findNode(nodes, sourceId);
      if (
        current &&
        current.parent_id === payload.parent_id &&
        String(current.sort_order) === String(payload.sort_order)
      ) {
        resetDrag();
        return;
      }

      setDraggingBusy(true);
      flip.capture(containerRef.current);

      const movePromise = moveNode(sourceId, payload);

      if (payload.parent_id) {
        expandFolder(payload.parent_id);
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          flip.animate(containerRef.current);
        });
      });

      try {
        await movePromise;
      } catch {
        /* lastError 已由 store 写入；回滚后无需额外 FLIP */
      } finally {
        setDraggingBusy(false);
        resetDrag();
      }
    },
    [nodes, moveNode, expandFolder, flip, resetDrag],
  );

  const handleDropWithTarget = useCallback(
    (e: DragEvent, target: DropTarget) => {
      e.preventDefault();
      e.stopPropagation();
      const sourceId =
        e.dataTransfer.getData(DRAG_TYPE) || dragSourceId || "";
      if (!sourceId || draggingBusy) {
        resetDrag();
        return;
      }
      void commitDrop(sourceId, target);
    },
    [dragSourceId, draggingBusy, commitDrop, resetDrag],
  );

  const rootEndTarget: DropTarget = {
    nodeId: null,
    parentId: null,
    position: "after",
  };

  return {
    dragSourceId,
    dropTarget,
    draggingBusy,
    containerRef,
    resetDrag,
    proposeDropTarget,
    handleDragStart,
    handleDragEnd,
    zoneFromFolderRow,
    zoneFromMemoRow,
    handleDropWithTarget,
    rootEndTarget,
  };
}
