/**
 * [INPUT]: 依赖 react-router Outlet/useLocation、AppSidebar、ContextPanel、
 *         AgentPanel、sidebar.store、agent-panel.store、shared/ui ToastViewport、
 *         widgets/FeedbackDialog
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
 *
 * 收束改动（发布冻结）：
 * - 窄屏（<960px）默认关闭 Agent 面板，避免三栏挤爆
 * - 外层容器 overflow-x-auto 兜底，避免内容被裁切
 * - 右下角常驻「反馈」浮动按钮 + FeedbackDialog + 全局 ToastViewport
 */
import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { useAgentPanelStore } from "../shared/stores/agent-panel.store";
import {
  PANEL_VIEWS,
  useSidebarStore,
  viewFromPath,
} from "../shared/stores/sidebar.store";
import { ToastViewport } from "../shared/ui";
import { AgentPanel } from "../widgets/AgentPanel";
import { AppSidebar } from "../widgets/AppSidebar";
import { ContextPanel } from "../widgets/ContextPanel";
import { FeedbackDialog } from "../widgets/FeedbackDialog/FeedbackDialog";

/** 窄屏阈值：低于此宽度默认关闭 Agent 面板，避免三栏挤爆 */
const NARROW_SCREEN_QUERY = "(max-width: 959px)";

export function AppShell() {
  const location = useLocation();
  const agentOpen = useAgentPanelStore((s) => s.open);

  const activeView = useSidebarStore((s) => s.activeView);
  const panelOpen = useSidebarStore((s) => s.panelOpen);

  const [feedbackOpen, setFeedbackOpen] = useState(false);

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

  /* ── 响应式兜底：窄屏默认关闭 Agent 面板（仅单向收，不强制开） ─ */
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(NARROW_SCREEN_QUERY);
    const apply = (e: MediaQueryList | MediaQueryListEvent) => {
      if (e.matches) {
        useAgentPanelStore.getState().closePanel();
      }
    };
    apply(mq);
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

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
    <div className="h-dvh overflow-x-auto overflow-y-hidden bg-putty text-ink">
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

      {/* 常驻反馈入口：右下角浮动按钮（设计系统 token 控制间距） */}
      <button
        type="button"
        className="ds-feedback-fab ds-button ds-button--primary ds-button--md"
        aria-label="反馈"
        onClick={() => setFeedbackOpen(true)}
      >
        <span className="ds-button__icon" aria-hidden="true">
          <MessageSquare className="size-icon-sm" />
        </span>
        <span className="ds-button__label">反馈</span>
      </button>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <ToastViewport />
    </div>
  );
}
