/**
 * [INPUT]: 依赖 React DragEvent、lucide-react 图标、shared/ui/cn、
 *         shared/types/memo、DropLine
 * [OUTPUT]: 对外提供 MemoTreeNodeRow（单节点行 + 后落点 + 展开子树）
 * [POS]: widgets/MemoTree 子组件；MemoTree renderLevel 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { DragEvent, ReactNode } from "react";
import {
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
} from "lucide-react";

import type { MemoTreeNode as NodeType } from "../../shared/types/memo";
import { cn } from "../../shared/ui/cn";
import { DropLine } from "./DropLine";

/* -------------------------------------------------------------------------- */
/* Types                                                                        */
/* -------------------------------------------------------------------------- */

export type MemoTreeNodeRowProps = {
  node: NodeType;
  depth: number;
  isActive: boolean;
  isExpanded: boolean;
  isRenaming: boolean;
  isDragging: boolean;
  renameValue: string;
  dropInside: boolean;
  dropBefore: boolean;
  dragSourceId: string | null;
  draggingBusy: boolean;
  /** 节点后落点状态 */
  afterActive: boolean;
  afterDisabled: boolean;
  /** 子树渲染（由父级 renderLevel 递归注入） */
  childrenContent?: ReactNode;
  /* 回调 */
  onDragStart: (e: DragEvent, nodeId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: DragEvent, node: NodeType) => void;
  onDrop: (e: DragEvent, node: NodeType) => void;
  onClick: (node: NodeType) => void;
  onDoubleClick: (node: NodeType) => void;
  onContextMenu: (e: React.MouseEvent, node: NodeType) => void;
  onRenameChange: (value: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  onAfterDropLine: (e: DragEvent) => void;
  onAfterHover: (e: DragEvent) => void;
};

/* -------------------------------------------------------------------------- */
/* Component                                                                    */
/* -------------------------------------------------------------------------- */

export function MemoTreeNodeRow({
  node,
  depth,
  isActive,
  isExpanded,
  isRenaming,
  isDragging,
  renameValue,
  dropInside,
  dropBefore,
  draggingBusy,
  afterActive,
  afterDisabled,
  childrenContent,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onClick,
  onDoubleClick,
  onContextMenu,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  onAfterDropLine,
  onAfterHover,
}: MemoTreeNodeRowProps) {
  const isFolder = node.node_type === "folder";

  return (
    <div className="ds-tree-subtree">
      {/* 节点行 */}
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
        onDragStart={(e) => onDragStart(e, node.id)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOver(e, node)}
        onDrop={(e) => onDrop(e, node)}
        onClick={() => onClick(node)}
        onDoubleClick={() => onDoubleClick(node)}
        onContextMenu={(e) => onContextMenu(e, node)}
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
            isExpanded ? <FolderOpen /> : <Folder />
          ) : (
            <FileText />
          )}
        </span>

        {isRenaming ? (
          <input
            className="ds-tree-node__rename"
            value={renameValue}
            autoFocus
            aria-label="重命名节点"
            onChange={(e) => onRenameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void onRenameCommit();
              if (e.key === "Escape") onRenameCancel();
            }}
            onBlur={() => void onRenameCommit()}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="ds-tree-node__title">{node.title}</span>
        )}
      </div>

      {/* 展开的 children */}
      {isFolder && isExpanded && childrenContent && (
        <div className="ds-tree-children">{childrenContent}</div>
      )}

      {/* 节点后落点 */}
      <DropLine
        depth={depth}
        active={afterActive}
        disabled={afterDisabled}
        onHover={onAfterHover}
        onDropLine={onAfterDropLine}
      />
    </div>
  );
}
