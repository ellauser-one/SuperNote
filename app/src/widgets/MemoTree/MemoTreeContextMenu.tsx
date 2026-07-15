/**
 * [INPUT]: 依赖 React useEffect/useRef，依赖 lucide-react 图标
 * [OUTPUT]: 对外提供 MemoTreeContextMenu 弹出菜单
 * [POS]: widgets/MemoTree 右键菜单层；新建文件夹/备忘录入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { FilePlus, FolderPlus } from "lucide-react";
import { useEffect, useRef } from "react";

export type ContextMenuAction = "create-folder" | "create-memo";

type MemoTreeContextMenuProps = {
  x: number;
  y: number;
  onAction: (action: ContextMenuAction) => void;
  onClose: () => void;
};

export function MemoTreeContextMenu({
  x,
  y,
  onAction,
  onClose,
}: MemoTreeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="ds-tree-context-menu"
      style={{ left: x, top: y }}
      role="menu"
    >
      <button
        type="button"
        className="ds-tree-context-menu__item"
        role="menuitem"
        onClick={() => {
          onAction("create-folder");
          onClose();
        }}
      >
        <FolderPlus className="size-icon-xs" aria-hidden="true" />
        新建文件夹
      </button>
      <button
        type="button"
        className="ds-tree-context-menu__item"
        role="menuitem"
        onClick={() => {
          onAction("create-memo");
          onClose();
        }}
      >
        <FilePlus className="size-icon-xs" aria-hidden="true" />
        新建备忘录
      </button>
    </div>
  );
}
