/**
 * [INPUT]: 依赖 zustand store、lucide-react 图标、react-router useNavigate、
 *         useFlipAnimation、MemoTreeContextMenu、CreateNodeDialog
 * [OUTPUT]: 对外提供 MemoTree 完整侧栏文件树组件
 * [POS]: widgets/MemoTree 主组件；递归渲染节点行，管理拖拽/重命名/右键/创建状态
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";

import { useMemoTreeStore } from "../../shared/stores/memo-tree.store";
import {
  computeSortOrder,
  findNode,
  findSiblings,
  isDescendant,
  sortNodes,
} from "../../shared/lib/memo-tree-helpers";
import type { MemoTreeNode as NodeType } from "../../shared/types/memo";
import { CreateNodeDialog } from "./CreateNodeDialog";
import {
  MemoTreeContextMenu,
  type ContextMenuAction,
} from "./MemoTreeContextMenu";
import { useFlipAnimation } from "./useFlipAnimation";
import { cn } from "../../shared/ui/cn";

/* -------------------------------------------------------------------------- */
/* 拖拽常量                                                                     */
/* -------------------------------------------------------------------------- */

const DRAG_TYPE = "application/x-supernote-node-id";
const DROP_ZONE_BEFORE = 0.24;
const DROP_ZONE_AFTER = 0.76;

type DropPosition = "before" | "after" | "inside" | "root-end";

/* -------------------------------------------------------------------------- */
/* last-opened 持久化                                                           */
/* -------------------------------------------------------------------------- */

const LAST_OPENED_KEY = "supernote:last-opened-memo";

function getLastOpened(): string | null {
  try {
    return localStorage.getItem(LAST_OPENED_KEY);
  } catch {
    return null;
  }
}

function setLastOpened(nodeId: string) {
  try {
    localStorage.setItem(LAST_OPENED_KEY, nodeId);
  } catch {
    /* noop */
  }
}

/* -------------------------------------------------------------------------- */
/* 主组件                                                                       */
/* -------------------------------------------------------------------------- */

export function MemoTree() {
  const nodes = useMemoTreeStore((s) => s.nodes);
  const loading = useMemoTreeStore((s) => s.loading);
  const fetchTree = useMemoTreeStore((s) => s.fetchTree);
  const moveNode = useMemoTreeStore((s) => s.moveNode);
  const renameNode = useMemoTreeStore((s) => s.renameNode);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const flip = useFlipAnimation();

  /* ── 展开/折叠 ──────────────────────────────────────────────── */
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /* ── 选中态 ─────────────────────────────────────────────────── */
  const [activeId, setActiveId] = useState<string | null>(null);

  /* ── 拖拽态 ─────────────────────────────────────────────────── */
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);
  const [dropIndicatorStyle, setDropIndicatorStyle] = useState<
    { top: number; left: number; right: number } | null
  >(null);

  /* ── 重命名态 ───────────────────────────────────────────────── */
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  /* ── 右键菜单态 ─────────────────────────────────────────────── */
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    targetParentId: string | null;
  } | null>(null);

  /* ── 创建对话框态 ───────────────────────────────────────────── */
  const [createDialog, setCreateDialog] = useState<{
    type: "folder" | "memo";
    parentId: string | null;
  } | null>(null);

  /* ── 初始化拉取 ─────────────────────────────────────────────── */
  useEffect(() => {
    const controller = new AbortController();
    fetchTree(controller.signal).then((tree) => {
      const lastId = getLastOpened();
      if (lastId && findNode(tree, lastId)) {
        setActiveId(lastId);
        navigate(`/app/notes/${lastId}`, { replace: true });
      } else if (tree.length === 0) {
        // 空树：自动创建一个根级 memo
        // 由父组件或 store 处理
      }
    }).catch(() => {
      /* AbortError 或网络错误，静默 */
    });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 点击 memo 导航 ────────────────────────────────────────── */
  const handleSelect = useCallback(
    (node: NodeType) => {
      setActiveId(node.id);
      if (node.node_type === "memo") {
        setLastOpened(node.id);
        navigate(`/app/notes/${node.id}`);
      }
    },
    [navigate],
  );

  /* ── FLIP: nodes 变化时执行动画 ────────────────────────────── */
  useEffect(() => {
    flip.capture(containerRef.current);
  });

  useEffect(() => {
    flip.animate(containerRef.current);
  });

  /* ── 拖拽：dragStart ───────────────────────────────────────── */
  const handleDragStart = useCallback(
    (e: DragEvent, nodeId: string) => {
      setDragSourceId(nodeId);
      e.dataTransfer.setData(DRAG_TYPE, nodeId);
      e.dataTransfer.effectAllowed = "move";
    },
    [],
  );

  /* ── 拖拽：计算 drop 区域 ──────────────────────────────────── */
  const computeDropZone = useCallback(
    (e: DragEvent, node: NodeType): DropPosition => {
      if (node.node_type === "folder") {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const ratio = (e.clientY - rect.top) / rect.height;
        if (ratio < DROP_ZONE_BEFORE) return "before";
        if (ratio > DROP_ZONE_AFTER) return "after";
        return "inside";
      }
      // memo 只支持 before/after
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const ratio = (e.clientY - rect.top) / rect.height;
      return ratio < 0.5 ? "before" : "after";
    },
    [],
  );

  /* ── 拖拽：dragOver ────────────────────────────────────────── */
  const handleDragOver = useCallback(
    (e: DragEvent, node: NodeType) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      if (!dragSourceId || dragSourceId === node.id) return;
      // 禁止拖入自己或后代
      if (
        node.node_type === "folder" &&
        isDescendant(nodes, dragSourceId, node.id)
      ) {
        return;
      }

      const position = computeDropZone(e, node);
      setDropTargetId(node.id);
      setDropPosition(position);

      // 更新 drop indicator 位置
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        if (position === "before") {
          setDropIndicatorStyle({
            top: rect.top - containerRect.top,
            left: rect.left - containerRect.left,
            right: containerRect.right - rect.right,
          });
        } else if (position === "after") {
          setDropIndicatorStyle({
            top: rect.bottom - containerRect.top,
            left: rect.left - containerRect.left,
            right: containerRect.right - rect.right,
          });
        } else {
          setDropIndicatorStyle(null);
        }
      }
    },
    [dragSourceId, nodes, computeDropZone],
  );

  /* ── 拖拽：根区域 dragOver ─────────────────────────────────── */
  const handleRootDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!dragSourceId) return;

      setDropTargetId(null);
      setDropPosition("root-end");
      setDropIndicatorStyle(null);
    },
    [dragSourceId],
  );

  /* ── 拖拽：drop ────────────────────────────────────────────── */
  const handleDrop = useCallback(
    (e: DragEvent, targetNode?: NodeType) => {
      e.preventDefault();
      const sourceId = e.dataTransfer.getData(DRAG_TYPE);
      if (!sourceId) return;

      // 禁止拖自己
      if (targetNode && sourceId === targetNode.id) {
        resetDrag();
        return;
      }

      // 禁止拖入后代
      if (
        targetNode?.node_type === "folder" &&
        isDescendant(nodes, sourceId, targetNode.id)
      ) {
        resetDrag();
        return;
      }

      flip.capture(containerRef.current);

      if (!targetNode || dropPosition === "root-end") {
        // 放到根目录末尾
        const siblings = findSiblings(nodes, null).filter(
          (n) => n.id !== sourceId,
        );
        const sortOrder = computeSortOrder(siblings, "append");
        void moveNode(sourceId, { parent_id: null, sort_order: sortOrder }, sortOrder);
      } else if (dropPosition === "inside" && targetNode.node_type === "folder") {
        // 拖入文件夹内部：作为第一个子节点
        const children = sortNodes(targetNode.children).filter(
          (n) => n.id !== sourceId,
        );
        const sortOrder = computeSortOrder(children, "prepend");
        void moveNode(
          sourceId,
          { parent_id: targetNode.id, sort_order: sortOrder },
          sortOrder,
        );
        // 自动展开目标文件夹
        setExpanded((prev) => new Set(prev).add(targetNode.id));
      } else {
        // before / after 某个节点
        const siblings = findSiblings(nodes, targetNode.parent_id).filter(
          (n) => n.id !== sourceId,
        );
        const targetIndex = siblings.findIndex((n) => n.id === targetNode.id);
        const sortOrder =
          dropPosition === "before"
            ? computeSortOrder(siblings, { afterIndex: targetIndex - 1 })
            : computeSortOrder(siblings, { afterIndex: targetIndex });
        void moveNode(
          sourceId,
          { parent_id: targetNode.parent_id, sort_order: sortOrder },
          sortOrder,
        );
      }

      resetDrag();
    },
    [dropPosition, nodes, moveNode, flip],
  );

  const handleRootDrop = useCallback(
    (e: DragEvent) => {
      handleDrop(e);
    },
    [handleDrop],
  );

  const resetDrag = useCallback(() => {
    setDragSourceId(null);
    setDropTargetId(null);
    setDropPosition(null);
    setDropIndicatorStyle(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    resetDrag();
  }, [resetDrag]);

  /* ── 双击重命名 ────────────────────────────────────────────── */
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
        /* store 已回滚 */
      }
    }
    setRenamingId(null);
    setRenameValue("");
  }, [renamingId, renameValue, renameNode]);

  const cancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameValue("");
  }, []);

  /* ── 右键菜单 ──────────────────────────────────────────────── */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, parentId: string | null) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, targetParentId: parentId });
    },
    [],
  );

  const handleContextAction = useCallback(
    (action: ContextMenuAction) => {
      const parentId = contextMenu?.targetParentId ?? null;
      if (action === "create-folder") {
        setCreateDialog({ type: "folder", parentId });
      } else {
        setCreateDialog({ type: "memo", parentId });
      }
    },
    [contextMenu],
  );

  /* ── 创建回调 ──────────────────────────────────────────────── */
  const handleCreated = useCallback(
    (nodeId: string) => {
      const node = findNode(useMemoTreeStore.getState().nodes, nodeId);
      if (node?.node_type === "memo") {
        setLastOpened(nodeId);
        navigate(`/app/notes/${nodeId}`);
      }
    },
    [navigate],
  );

  /* ── 递归渲染 ──────────────────────────────────────────────── */
  const renderNode = useCallback(
    (node: NodeType, depth: number) => {
      const isFolder = node.node_type === "folder";
      const isExpanded = expanded.has(node.id);
      const isActive = activeId === node.id;
      const isDropInside =
        dropTargetId === node.id && dropPosition === "inside";
      const isRenaming = renamingId === node.id;
      const sortedChildren = sortNodes(node.children);

      return (
        <div key={node.id}>
          <div
            data-flip-id={node.id}
            className={cn(
              "ds-tree-node",
              isActive && "ds-tree-node--active",
              isDropInside && "ds-tree-node--drop-inside",
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            draggable={!isRenaming}
            onDragStart={(e) => handleDragStart(e, node.id)}
            onDragOver={(e) => handleDragOver(e, node)}
            onDrop={(e) => handleDrop(e, node)}
            onDragEnd={handleDragEnd}
            onClick={() => {
              if (isFolder) toggleExpand(node.id);
              handleSelect(node);
            }}
            onDoubleClick={() => handleDoubleClick(node)}
            onContextMenu={(e) =>
              handleContextMenu(e, isFolder ? node.id : node.parent_id)
            }
          >
            {/* 折叠箭头 */}
            {isFolder ? (
              <span
                className={cn(
                  "ds-tree-node__chevron",
                  isExpanded && "ds-tree-node__chevron--open",
                )}
              >
                <ChevronRight />
              </span>
            ) : (
              <span className="ds-tree-node__chevron" style={{ visibility: "hidden" }}>
                <ChevronRight />
              </span>
            )}

            {/* 图标 */}
            <span className="ds-tree-node__icon">
              {isFolder ? (
                isExpanded ? (
                  <FolderOpen />
                ) : (
                  <Folder />
                )
              ) : (
                <FileText />
              )}
            </span>

            {/* 标题或重命名输入框 */}
            {isRenaming ? (
              <input
                className="ds-tree-node__rename"
                value={renameValue}
                autoFocus
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") cancelRename();
                }}
                onBlur={commitRename}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="ds-tree-node__title">{node.title}</span>
            )}
          </div>

          {/* 子节点 */}
          {isFolder && isExpanded && sortedChildren.length > 0 && (
            <div className="ds-tree-children">
              {sortedChildren.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    },
    [
      expanded,
      activeId,
      dropTargetId,
      dropPosition,
      renamingId,
      renameValue,
      handleDragStart,
      handleDragOver,
      handleDrop,
      handleDragEnd,
      toggleExpand,
      handleSelect,
      handleDoubleClick,
      handleContextMenu,
      commitRename,
      cancelRename,
    ],
  );

  const rootNodes = sortNodes(nodes);

  if (loading && nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center font-helvetica-now text-ui text-graphite">
        加载中…
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-0 flex-1 flex-col overflow-y-auto"
      onContextMenu={(e) => handleContextMenu(e, null)}
      onDragOver={handleRootDragOver}
      onDrop={handleRootDrop}
    >
      {/* Drop indicator 横线 */}
      {dropIndicatorStyle && (
        <div
          className="ds-tree-drop-indicator"
          style={{
            top: dropIndicatorStyle.top,
            left: dropIndicatorStyle.left,
            right: dropIndicatorStyle.right,
          }}
        />
      )}

      {rootNodes.map((node) => renderNode(node, 0))}

      {/* 根区域空白 drop 区 */}
      <div className="ds-tree-root-drop" />

      {/* 右键菜单 */}
      {contextMenu && (
        <MemoTreeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onAction={handleContextAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* 创建对话框 */}
      {createDialog && (
        <CreateNodeDialog
          open={Boolean(createDialog)}
          type={createDialog.type}
          parentId={createDialog.parentId}
          onClose={() => setCreateDialog(null)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
