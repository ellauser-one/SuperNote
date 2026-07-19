/**
 * [INPUT]: 依赖 sidebar.store、widgets/MemoTree
 * [OUTPUT]: 对外提供 ContextPanel（侧栏旁的可折叠上下文面板）
 * [POS]: widgets 全局上下文面板；根据 activeView 渲染对应内容
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 面板内容映射：
 * - memos → MemoTree 文件树
 * - 其他 → 不渲染（面板宽度由 grid 列控制为 0）
 */
import { useCallback } from "react";

import { useAuth } from "../app/providers/AuthProvider";
import { setLastOpenedMemo } from "../shared/lib/last-opened-memo";
import { useSidebarStore } from "../shared/stores/sidebar.store";
import { MemoTree } from "./MemoTree/MemoTree";

export function ContextPanel() {
  const activeView = useSidebarStore((s) => s.activeView);
  const { user } = useAuth();

  const handleMemoOpened = useCallback(
    (nodeId: string) => {
      if (user?.id) setLastOpenedMemo(user.id, nodeId);
    },
    [user?.id],
  );

  return (
    <div className="ds-context-panel">
      {/* 内部固定宽度容器，确保收起时内容不压缩变形 */}
      <div
        className="flex h-full min-h-0 flex-col overflow-hidden border-r border-vellum bg-chalk"
        style={{ width: "var(--layout-context-panel)" }}
      >
        {activeView === "memos" && <MemoTree onMemoOpened={handleMemoOpened} />}
      </div>
    </div>
  );
}
