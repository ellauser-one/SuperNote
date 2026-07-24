/**
 * [INPUT]: 依赖 React useEffect/useRef，依赖 lucide-react 图标
 * [OUTPUT]: 对外提供 MemoTreeContextMenu 弹出菜单（自动视口边缘翻转）
 * [POS]: widgets/MemoTree 右键菜单层；新建 / 重命名入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { FilePlus, FolderPlus, Pencil } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type ContextMenuAction =
  | "create-folder"
  | "create-memo"
  | "rename";

type MemoTreeContextMenuProps = {
  x: number;
  y: number;
  /** 右键点在某个节点上时显示「重命名」 */
  canRename?: boolean;
  onAction: (action: ContextMenuAction) => void;
  onClose: () => void;
};

export function MemoTreeContextMenu({
  x,
  y,
  canRename = false,
  onAction,
  onClose,
}: MemoTreeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ left: x, top: y });

  /* ── 视口边缘翻转：菜单超出右/下边界时自动向左/上偏移 ──── */
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = x;
    let top = y;
    if (rect.right > vw) left = vw - rect.width - 4;
    if (rect.bottom > vh) top = vh - rect.height - 4;
    if (left < 0) left = 4;
    if (top < 0) top = 4;
    setAdjustedPos({ left, top });
  }, [x, y]);

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

  const handleAction = useCallback((action: ContextMenuAction) => {
    onAction(action);
    onClose();
  }, [onAction, onClose]);

  return (
    <div
      ref={menuRef}
      className="ds-tree-context-menu"
      style={{ left: adjustedPos.left, top: adjustedPos.top }}
      role="menu"
    >
      {canRename ? (
        <button
          type="button"
          className="ds-tree-context-menu__item"
          role="menuitem"
          onClick={() => handleAction("rename")}
        >
          <Pencil className="size-icon-xs" aria-hidden="true" />
          重命名
        </button>
      ) : null}
      <button
        type="button"
        className="ds-tree-context-menu__item"
        role="menuitem"
        onClick={() => handleAction("create-folder")}
      >
        <FolderPlus className="size-icon-xs" aria-hidden="true" />
        新建文件夹
      </button>
      <button
        type="button"
        className="ds-tree-context-menu__item"
        role="menuitem"
        onClick={() => handleAction("create-memo")}
      >
        <FilePlus className="size-icon-xs" aria-hidden="true" />
        新建备忘录
      </button>
    </div>
  );
}
