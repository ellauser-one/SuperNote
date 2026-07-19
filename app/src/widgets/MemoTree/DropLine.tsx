/**
 * [INPUT]: 依赖 shared/ui/cn、React DragEvent
 * [OUTPUT]: 对外提供 DropLine（树拖拽真实落点指示线）
 * [POS]: widgets/MemoTree 子组件；MemoTree 内 renderLevel 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { DragEvent } from "react";

import { cn } from "../../shared/ui/cn";

type DropLineProps = {
  depth: number;
  active: boolean;
  disabled?: boolean;
  onHover: (e: DragEvent) => void;
  onDropLine: (e: DragEvent) => void;
};

export function DropLine({
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
