/**
 * [INPUT]: 依赖 react-router Outlet/useLocation、AppSidebar、ContextPanel、
 *         AgentPanel、sidebar.store、agent-panel.store
 * [OUTPUT]: 对外提供 AppShell（登录后全局壳）
 * [POS]: pages /app 布局父级；Sidebar + 上下文面板 + 主内容 + Agent 面板
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 布局：
 * [Sidebar 220px] [Context Panel 0|280px] [Main flex-1] [Agent 可选]
 *
 * 同步策略：URL 是唯一真相源，单向同步
 * - URL 变化 → useEffect 更新 sidebar.store（URL→Store 单向）
 * - 点击导航 → AppSidebar 直接调 navigate + navigateTo（不走 effect）
 * - 禁止 Store→URL 反向 effect（闭包陈旧值会导致死循环）
 */
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { useAgentPanelStore } from "../shared/stores/agent-panel.store";
import {
  PANEL_VIEWS,
  useSidebarStore,
  viewFromPath,
} from "../shared/stores/sidebar.store";
import { AgentPanel } from "../widgets/AgentPanel";
import { AppSidebar } from "../widgets/AppSidebar";
import { ContextPanel } from "../widgets/ContextPanel";

export function AppShell() {
  const location = useLocation();
  const agentOpen = useAgentPanelStore((s) => s.open);

  const activeView = useSidebarStore((s) => s.activeView);
  const panelOpen = useSidebarStore((s) => s.panelOpen);

  /* ── URL → Store：路由变化时单向同步 activeView ──────────── */
  useEffect(() => {
    const view = viewFromPath(location.pathname);
    const storeState = useSidebarStore.getState();
    if (storeState.activeView !== view) {
      if (PANEL_VIEWS.has(view)) {
        useSidebarStore.setState({ activeView: view, panelOpen: true });
      } else {
        useSidebarStore.setState({ activeView: view, panelOpen: false });
      }
    }
  }, [location.pathname]);

  /* ── Grid 列定义 ──────────────────────────────────────────── */
  const columns = [
    "var(--layout-sidebar)",
    panelOpen && PANEL_VIEWS.has(activeView)
      ? "var(--layout-context-panel)"
      : "0px",
    "minmax(0, 1fr)",
    ...(agentOpen ? ["var(--layout-agent)"] : []),
  ].join(" ");

  return (
    <div className="h-dvh overflow-hidden bg-putty text-ink">
      <div
        className="ds-app-grid"
        style={{ gridTemplateColumns: columns }}
      >
        <AppSidebar />

        <ContextPanel />

        <div className="min-h-0 min-w-0 overflow-hidden">
          <Outlet />
        </div>

        {agentOpen ? <AgentPanel /> : null}
      </div>
    </div>
  );
}
