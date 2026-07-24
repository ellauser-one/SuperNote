/**
 * [INPUT]: 依赖 zustand store、lucide-react、react-router、
 *         memo-tree-helpers、MemoTreeContextMenu、CreateNodeDialog、useMemoTreeDnd
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
 * - 搜索：对「已加载」树节点按标题/正文做客户端过滤（不新增后端接口）
 */
import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FilePlus,
  FolderPlus,
  Loader2,
} from "lucide-react";

import {
  canDropTarget,
  sortNodes,
} from "../../shared/lib/memo-tree-helpers";
import { useMemoTreeStore } from "../../shared/stores/memo-tree.store";
import type {
  DropTarget,
  MemoTreeNode as NodeType,
} from "../../shared/types/memo";
import { Button, cn } from "../../shared/ui";
import { CreateNodeDialog } from "./CreateNodeDialog";
import { DropLine } from "./DropLine";
import { MemoTreeNodeRow } from "./MemoTreeNodeRow";
import {
  MemoTreeContextMenu,
} from "./MemoTreeContextMenu";
import { useMemoTreeActions } from "./useMemoTreeActions";
import { useMemoTreeDnd } from "./useMemoTreeDnd";

/** 树中是否存在任意 folder（含子树） */
function hasAnyFolder(nodes: NodeType[]): boolean {
  for (const n of nodes) {
    if (n.node_type === "folder") return true;
    if (n.children.length > 0 && hasAnyFolder(n.children)) return true;
  }
  return false;
}

/**
 * 客户端过滤：对「已加载」树按标题/正文做匹配。
 * 命中自身、或任一后代命中 → 保留该节点（与子树一起）。
 * 只读内存数据，不触发任何后端请求。
 */
function filterTree(nodes: NodeType[], query: string): NodeType[] {
  const out: NodeType[] = [];
  for (const node of nodes) {
    const children = filterTree(node.children, query);
    const selfHit =
      node.title.toLowerCase().includes(query) ||
      Boolean(node.memo?.content_mdx?.toLowerCase().includes(query));
    if (selfHit || children.length > 0) {
      out.push({ ...node, children });
    }
  }
  return out;
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
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();

  /* ── 搜索：客户端过滤已加载树 ─────────────────────────────── */
  const [search, setSearch] = useState("");
  const displayNodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return nodes;
    return filterTree(nodes, q);
  }, [nodes, search]);


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

  /* ── 拖拽（委托 useMemoTreeDnd hook） ─────────────────────── */
  const {
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
  } = useMemoTreeDnd(expandFolder);

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



  /* ── 重命名 / 菜单 / 创建（委托 useMemoTreeActions） ──────── */
  const {
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
  } = useMemoTreeActions(expandFolder, onMemoOpened);

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
              <MemoTreeNodeRow
                key={node.id}
                node={node}
                depth={depth}
                isActive={isActive}
                isExpanded={isExpanded}
                isRenaming={isRenaming}
                isDragging={isDragging}
                renameValue={renameValue}
                dropInside={dropInside}
                dropBefore={dropBefore}
                dragSourceId={dragSourceId}
                draggingBusy={draggingBusy}
                afterActive={Boolean(dragSourceId) && afterActive}
                afterDisabled={afterDisabled}
                childrenContent={
                  isFolder && isExpanded
                    ? renderLevel(node.children, node.id, depth + 1)
                    : undefined
                }
                onDragStart={handleDragStart}
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
                    resetDrag();
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
                onClick={(n) => {
                  if (n.node_type === "folder") toggleExpand(n.id);
                  handleSelect(n);
                }}
                onDoubleClick={handleDoubleClick}
                onContextMenu={(e, n) =>
                  handleContextMenu(e, {
                    parentId: n.node_type === "folder" ? n.id : n.parent_id,
                    nodeId: n.id,
                    title: n.title,
                  })
                }
                onRenameChange={setRenameValue}
                onRenameCommit={commitRename}
                onRenameCancel={cancelRename}
                onAfterHover={() => proposeDropTarget(afterTarget)}
                onAfterDropLine={(e) => handleDropWithTarget(e, afterTarget)}
              />
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

  const rootEndActive =
    Boolean(dragSourceId) &&
    dropTarget?.nodeId === null &&
    dropTarget.parentId === null &&
    dropTarget.position === "after";

  const showFolderHint = !loading && displayNodes.length > 0 && !hasAnyFolder(displayNodes);
  const showEmptyHint = !loading && displayNodes.length === 0 && !search.trim();
  const showNoMatch = !loading && displayNodes.length === 0 && Boolean(search.trim());

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {/* 侧栏头：标题 + 可见新建入口 */}
      <div className="flex shrink-0 items-center justify-between gap-8 border-b border-vellum px-12 py-10">
        <div className="min-w-0">
          <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
            备忘录
          </p>
          <h1 className="truncate font-davinci text-title font-medium">
            备忘录
          </h1>
        </div>
        <div className="ds-tree-toolbar">
          <Button
            flat
            size="sm"
            aria-label="新建文件夹"
            icon={<FolderPlus className="size-icon-xs" aria-hidden="true" />}
            onClick={() => openCreate("folder", null)}
          >
            <span className="hidden sm:inline">文件夹</span>
          </Button>
          <Button
            flat
            size="sm"
            aria-label="新建备忘录"
            icon={<FilePlus className="size-icon-xs" aria-hidden="true" />}
            onClick={() => openCreate("memo", null)}
          >
            <span className="hidden sm:inline">备忘录</span>
          </Button>
        </div>
      </div>

      <div
        className="shrink-0 px-12 py-6"
      >
        <input
          type="search"
          aria-label="搜索备忘录"
          className="ds-input"
          placeholder="搜索备忘录…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
            resetDrag();
          }
        }}
      >
        {loading && nodes.length === 0 ? (
          <div className="flex flex-1 items-center justify-center gap-4 font-helvetica-now text-ui text-graphite">
            <Loader2 className="size-icon-sm animate-spin" aria-hidden="true" />
            加载中…
          </div>
        ) : (
          <>
            {showEmptyHint && (
              <div className="ds-tree-empty">
                <p>还没有内容，先建文件夹或直接写备忘录。</p>
                <div className="ds-tree-empty__actions">
                  <Button
                    flat
                    size="sm"
                    icon={<FolderPlus className="size-icon-xs" aria-hidden="true" />}
                    onClick={() => openCreate("folder", null)}
                  >
                    新建文件夹
                  </Button>
                  <Button
                    flat
                    size="sm"
                    icon={<FilePlus className="size-icon-xs" aria-hidden="true" />}
                    onClick={() => openCreate("memo", null)}
                  >
                    新建备忘录
                  </Button>
                </div>
              </div>
            )}

            {showNoMatch && (
              <div className="ds-tree-empty">
                <p>没有匹配的备忘录或文件夹。</p>
              </div>
            )}

            {showFolderHint && (
              <div className="ds-tree-empty">
                <p>
                  没有文件夹。点右上角「文件夹」创建后，可把备忘录拖进去。
                </p>
                <div className="ds-tree-empty__actions">
                  <Button
                    flat
                    size="sm"
                    icon={<FolderPlus className="size-icon-xs" aria-hidden="true" />}
                    onClick={() => openCreate("folder", null)}
                  >
                    新建文件夹
                  </Button>
                </div>
              </div>
            )}

            {renderLevel(displayNodes, null, 0)}

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
                  resetDrag();
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