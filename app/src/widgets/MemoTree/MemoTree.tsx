/**
 * [INPUT]: 依赖 zustand store、lucide-react、react-router、
 *         memo-tree-helpers、MemoTreeContextMenu、CreateNodeDialog、useFlipAnimation
 * [OUTPUT]: 对外提供 MemoTree 完整侧栏文件树（HTML5 DnD + 乐观 move + FLIP）
 * [POS]: widgets/MemoTree 主组件；folder/memo 同树；drop 后乐观 UI，成功不 refetch
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 拖拽心智：
 * - 每一层都是线性列表，有开头/末尾落点
 * - folder 标题：上 24% before / 中 52% inside / 下 24% after
 * - folder 的 after = 整个子树之后（同级），不在 title 与 children 之间
 * - 拖入 folder 中间区域 = 作为该 folder 第一个子节点
 * - 根空白区域 = parent_id null 末尾
 * - 禁止拖进自己 / 自己的后代
 * - move 乐观更新 + FLIP；失败 store 回滚 + toast
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
} from "lucide-react";

import {
  canDropTarget,
  findNode,
  resolveDropPlacement,
  sortNodes,
} from "../../shared/lib/memo-tree-helpers";
import { useMemoTreeStore } from "../../shared/stores/memo-tree.store";
import type {
  DropPosition,
  DropTarget,
  MemoTreeNode as NodeType,
} from "../../shared/types/memo";
import { cn } from "../../shared/ui/cn";
import { CreateNodeDialog } from "./CreateNodeDialog";
import {
  MemoTreeContextMenu,
  type ContextMenuAction,
} from "./MemoTreeContextMenu";
import { useFlipAnimation } from "./useFlipAnimation";

/** 树中是否存在任意 folder（含子树） */
function hasAnyFolder(nodes: NodeType[]): boolean {
  for (const n of nodes) {
    if (n.node_type === "folder") return true;
    if (n.children.length > 0 && hasAnyFolder(n.children)) return true;
  }
  return false;
}

/* -------------------------------------------------------------------------- */
/* 常量                                                                         */
/* -------------------------------------------------------------------------- */

const DRAG_TYPE = "application/x-supernote-node-id";
/** folder 标题行分区：上 before / 中 inside / 下 after（各约 24%） */
const FOLDER_BEFORE = 0.24;
const FOLDER_AFTER = 0.76;

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
/* DropLine — 真实落点（层级边界 / 节点后）                                      */
/* -------------------------------------------------------------------------- */

type DropLineProps = {
  depth: number;
  active: boolean;
  disabled?: boolean;
  onHover: (e: DragEvent) => void;
  onDropLine: (e: DragEvent) => void;
};

function DropLine({
  depth,
  active,
  disabled,
  onHover,
  onDropLine,
}: DropLineProps) {
  return (
    <div
      className={cn(
        "ds-tree-drop-line",
        active && "ds-tree-drop-line--active",
        disabled && "ds-tree-drop-line--disabled",
      )}
      style={{ marginLeft: `calc(${depth} * var(--spacing-12))` }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) {
          e.dataTransfer.dropEffect = "none";
          return;
        }
        e.dataTransfer.dropEffect = "move";
        onHover(e);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        onDropLine(e);
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Props                                                                        */
/* -------------------------------------------------------------------------- */

export type MemoTreeProps = {
  /** 打开 memo 时回调（用于 last-opened 等） */
  onMemoOpened?: (nodeId: string) => void;
};

/* -------------------------------------------------------------------------- */
/* 主组件                                                                       */
/* -------------------------------------------------------------------------- */

export function MemoTree({ onMemoOpened }: MemoTreeProps = {}) {
  const nodes = useMemoTreeStore((s) => s.nodes);
  const loading = useMemoTreeStore((s) => s.loading);
  const lastError = useMemoTreeStore((s) => s.lastError);
  const moveNode = useMemoTreeStore((s) => s.moveNode);
  const renameNode = useMemoTreeStore((s) => s.renameNode);
  const clearError = useMemoTreeStore((s) => s.clearError);
  const navigate = useNavigate();
  const { noteId } = useParams<{ noteId: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const flip = useFlipAnimation();

  /* ── 展开 / 选中 ───────────────────────────────────────────── */
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const activeId = noteId ?? null;

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandFolder = useCallback((id: string) => {
    setExpanded((prev) => new Set(prev).add(id));
  }, []);

  /* ── 拖拽态 ─────────────────────────────────────────────────── */
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [draggingBusy, setDraggingBusy] = useState(false);

  /* ── 重命名 / 菜单 / 创建 ──────────────────────────────────── */
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    /** 新建节点的 parent（folder 上右键 = 该 folder；memo 上 = 其 parent） */
    targetParentId: string | null;
    /** 被右键的节点 id；有值时可重命名 */
    targetNodeId: string | null;
    /** 被右键节点的当前标题（进入重命名时用） */
    targetTitle: string | null;
  } | null>(null);
  const [createDialog, setCreateDialog] = useState<{
    type: "folder" | "memo";
    parentId: string | null;
  } | null>(null);

  /* ── toast 自动消失 ────────────────────────────────────────── */
  useEffect(() => {
    if (!lastError) return;
    const t = window.setTimeout(() => clearError(), 4000);
    return () => window.clearTimeout(t);
  }, [lastError, clearError]);

  /* ── 选择 ──────────────────────────────────────────────────── */
  const handleSelect = useCallback(
    (node: NodeType) => {
      if (node.node_type === "memo") {
        onMemoOpened?.(node.id);
        navigate(`/app/notes/${node.id}`);
      }
    },
    [navigate, onMemoOpened],
  );

  /* ── 拖拽 helpers ──────────────────────────────────────────── */
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

  /** folder 标题行三段分区 */
  const zoneFromFolderRow = useCallback((e: DragEvent): DropPosition => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / Math.max(rect.height, 1);
    if (ratio < FOLDER_BEFORE) return "before";
    if (ratio > FOLDER_AFTER) return "after";
    return "inside";
  }, []);

  /** memo 标题行：上 before / 下 after */
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

      // 乐观 move 同步改 store；双 rAF 等 React 提交 DOM 后再 FLIP
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

  /* ── 重命名 ────────────────────────────────────────────────── */
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

  /* ── 右键 ──────────────────────────────────────────────────── */
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

  /* ── 渲染一层列表 ──────────────────────────────────────────── */
  const renderLevel = useCallback(
    (levelNodes: NodeType[], parentId: string | null, depth: number) => {
      const sorted = sortNodes(levelNodes);

      const startTarget: DropTarget = {
        nodeId: null,
        parentId,
        position: "before",
      };
      const endTarget: DropTarget = {
        nodeId: null,
        parentId,
        position: "after",
      };

      const startActive =
        dropTarget?.nodeId === null &&
        dropTarget.parentId === parentId &&
        dropTarget.position === "before";
      const endActive =
        dropTarget?.nodeId === null &&
        dropTarget.parentId === parentId &&
        dropTarget.position === "after";

      const startDisabled =
        Boolean(dragSourceId) &&
        !canDropTarget(nodes, dragSourceId!, startTarget);
      const endDisabled =
        Boolean(dragSourceId) &&
        !canDropTarget(nodes, dragSourceId!, endTarget);

      return (
        <div className="ds-tree-level">
          {/* 层级开头落点 */}
          <DropLine
            depth={depth}
            active={Boolean(dragSourceId) && startActive}
            disabled={startDisabled}
            onHover={() => proposeDropTarget(startTarget)}
            onDropLine={(e) => handleDropWithTarget(e, startTarget)}
          />

          {sorted.map((node) => {
            const isFolder = node.node_type === "folder";
            const isExpanded = expanded.has(node.id);
            const isActive = activeId === node.id;
            const isRenaming = renamingId === node.id;
            const isDragging = dragSourceId === node.id;

            const afterTarget: DropTarget = {
              nodeId: node.id,
              parentId: node.parent_id,
              position: "after",
            };
            const afterActive =
              dropTarget?.nodeId === node.id &&
              dropTarget.position === "after";
            const afterDisabled =
              Boolean(dragSourceId) &&
              !canDropTarget(nodes, dragSourceId!, afterTarget);

            const dropInside =
              dropTarget?.nodeId === node.id &&
              dropTarget.position === "inside";
            const dropBefore =
              dropTarget?.nodeId === node.id &&
              dropTarget.position === "before";

            return (
              <div key={node.id} className="ds-tree-subtree">
                {/* 节点行 — 自身就是 before/inside/after 落点 */}
                <div
                  data-flip-id={node.id}
                  className={cn(
                    "ds-tree-node",
                    isActive && "ds-tree-node--active",
                    dropInside && "ds-tree-node--drop-inside",
                    dropBefore && "ds-tree-node--drop-before",
                    isDragging && "ds-tree-node--dragging",
                  )}
                  style={{
                    paddingLeft: `calc(${depth} * var(--spacing-12) + var(--spacing-8))`,
                  }}
                  draggable={!isRenaming && !draggingBusy}
                  onDragStart={(e) => handleDragStart(e, node.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!dragSourceId || dragSourceId === node.id) {
                      e.dataTransfer.dropEffect = "none";
                      return;
                    }

                    const position = isFolder
                      ? zoneFromFolderRow(e)
                      : zoneFromMemoRow(e);
                    const next: DropTarget = {
                      nodeId: node.id,
                      parentId: node.parent_id,
                      position,
                    };

                    if (!canDropTarget(nodes, dragSourceId, next)) {
                      e.dataTransfer.dropEffect = "none";
                      setDropTarget(null);
                      return;
                    }

                    e.dataTransfer.dropEffect = "move";
                    proposeDropTarget(next);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!dragSourceId) return;

                    const position = isFolder
                      ? zoneFromFolderRow(e)
                      : zoneFromMemoRow(e);
                    const next: DropTarget = {
                      nodeId: node.id,
                      parentId: node.parent_id,
                      position,
                    };
                    handleDropWithTarget(e, next);
                  }}
                  onClick={() => {
                    if (isFolder) toggleExpand(node.id);
                    handleSelect(node);
                  }}
                  onDoubleClick={() => handleDoubleClick(node)}
                  onContextMenu={(e) =>
                    handleContextMenu(e, {
                      parentId: isFolder ? node.id : node.parent_id,
                      nodeId: node.id,
                      title: node.title,
                    })
                  }
                >
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
                    <span
                      className="ds-tree-node__chevron"
                      style={{ visibility: "hidden" }}
                    >
                      <ChevronRight />
                    </span>
                  )}

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

                  {isRenaming ? (
                    <input
                      className="ds-tree-node__rename"
                      value={renameValue}
                      autoFocus
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void commitRename();
                        if (e.key === "Escape") cancelRename();
                      }}
                      onBlur={() => void commitRename()}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="ds-tree-node__title">{node.title}</span>
                  )}
                </div>

                {/* 展开的 children：独立一层列表（有自己的首尾落点） */}
                {isFolder && isExpanded && (
                  <div className="ds-tree-children">
                    {renderLevel(node.children, node.id, depth + 1)}
                  </div>
                )}

                {/*
                  节点后落点：
                  - 对 folder 表示「整个子树之后」的同级 after
                  - 必须在 children 之后渲染，不能在 title 与 children 之间
                */}
                <DropLine
                  depth={depth}
                  active={Boolean(dragSourceId) && afterActive}
                  disabled={afterDisabled}
                  onHover={() => proposeDropTarget(afterTarget)}
                  onDropLine={(e) => handleDropWithTarget(e, afterTarget)}
                />
              </div>
            );
          })}

          {/* 层级末尾落点（空层也需要，方便拖入空 folder） */}
          <DropLine
            depth={depth}
            active={Boolean(dragSourceId) && endActive}
            disabled={endDisabled}
            onHover={() => proposeDropTarget(endTarget)}
            onDropLine={(e) => handleDropWithTarget(e, endTarget)}
          />
        </div>
      );
    },
    [
      nodes,
      expanded,
      activeId,
      renamingId,
      renameValue,
      dragSourceId,
      dropTarget,
      draggingBusy,
      proposeDropTarget,
      handleDropWithTarget,
      handleDragStart,
      handleDragEnd,
      zoneFromFolderRow,
      zoneFromMemoRow,
      toggleExpand,
      handleSelect,
      handleDoubleClick,
      handleContextMenu,
      commitRename,
      cancelRename,
    ],
  );

  const openCreate = useCallback(
    (type: "folder" | "memo", parentId: string | null = null) => {
      setCreateDialog({ type, parentId });
    },
    [],
  );

  const rootEndActive =
    Boolean(dragSourceId) &&
    dropTarget?.nodeId === null &&
    dropTarget.parentId === null &&
    dropTarget.position === "after";

  const showFolderHint = !loading && nodes.length > 0 && !hasAnyFolder(nodes);
  const showEmptyHint = !loading && nodes.length === 0;

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {/* 侧栏头：标题 + 可见新建入口（不只靠右键） */}
      <div className="flex shrink-0 items-center justify-between gap-8 border-b border-vellum px-12 py-10">
        <div className="min-w-0">
          <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
            Memo Tree
          </p>
          <h1 className="truncate font-davinci text-title font-medium">
            备忘录
          </h1>
        </div>
        <div className="ds-tree-toolbar">
          <button
            type="button"
            className="ds-tree-toolbar__btn"
            title="新建文件夹"
            aria-label="新建文件夹"
            onClick={() => openCreate("folder", null)}
          >
            <FolderPlus className="size-icon-xs" aria-hidden="true" />
            <span className="hidden sm:inline">文件夹</span>
          </button>
          <button
            type="button"
            className="ds-tree-toolbar__btn"
            title="新建备忘录"
            aria-label="新建备忘录"
            onClick={() => openCreate("memo", null)}
          >
            <FilePlus className="size-icon-xs" aria-hidden="true" />
            <span className="hidden sm:inline">备忘录</span>
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 flex-col overflow-y-auto"
        onContextMenu={(e) =>
          handleContextMenu(e, { parentId: null, nodeId: null, title: null })
        }
        onDragLeave={(e) => {
          if (
            e.currentTarget === e.target ||
            !e.currentTarget.contains(e.relatedTarget as Node)
          ) {
            setDropTarget(null);
          }
        }}
      >
        {loading && nodes.length === 0 ? (
          <div className="flex flex-1 items-center justify-center font-helvetica-now text-ui text-graphite">
            加载中…
          </div>
        ) : (
          <>
            {showEmptyHint && (
              <div className="ds-tree-empty">
                <p>还没有内容。先建一个文件夹，或直接写备忘录。</p>
                <div className="ds-tree-empty__actions">
                  <button
                    type="button"
                    className="ds-tree-toolbar__btn"
                    onClick={() => openCreate("folder", null)}
                  >
                    <FolderPlus className="size-icon-xs" aria-hidden="true" />
                    新建文件夹
                  </button>
                  <button
                    type="button"
                    className="ds-tree-toolbar__btn"
                    onClick={() => openCreate("memo", null)}
                  >
                    <FilePlus className="size-icon-xs" aria-hidden="true" />
                    新建备忘录
                  </button>
                </div>
              </div>
            )}

            {showFolderHint && (
              <div className="ds-tree-empty">
                <p>
                  当前只有备忘录，还没有文件夹。点右上角「文件夹」创建后，可把备忘录拖进去。
                </p>
                <div className="ds-tree-empty__actions">
                  <button
                    type="button"
                    className="ds-tree-toolbar__btn"
                    onClick={() => openCreate("folder", null)}
                  >
                    <FolderPlus className="size-icon-xs" aria-hidden="true" />
                    新建文件夹
                  </button>
                </div>
              </div>
            )}

            {renderLevel(nodes, null, 0)}

            {/* 根空白区域：拖到此处 = 根目录末尾 */}
            <div
              className={cn(
                "ds-tree-root-drop",
                rootEndActive && "ds-tree-root-drop--active",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!dragSourceId) {
                  e.dataTransfer.dropEffect = "none";
                  return;
                }
                if (!canDropTarget(nodes, dragSourceId, rootEndTarget)) {
                  e.dataTransfer.dropEffect = "none";
                  setDropTarget(null);
                  return;
                }
                e.dataTransfer.dropEffect = "move";
                proposeDropTarget(rootEndTarget);
              }}
              onDrop={(e) => handleDropWithTarget(e, rootEndTarget)}
            />
          </>
        )}

        {lastError && (
          <div className="ds-tree-toast" role="alert">
            {lastError}
          </div>
        )}
      </div>

      {contextMenu && (
        <MemoTreeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          canRename={Boolean(contextMenu.targetNodeId)}
          onAction={handleContextAction}
          onClose={() => setContextMenu(null)}
        />
      )}

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
