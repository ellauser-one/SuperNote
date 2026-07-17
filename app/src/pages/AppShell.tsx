/**
 * [INPUT]: 依赖 react-router Outlet/useLocation/useNavigate、AppSidebar、AgentPanel、agent-panel.store
 * [OUTPUT]: 对外提供 AppShell（登录后全局壳）
 * [POS]: pages /app 布局父级；备忘录工作区用图标轨 + 文件树主侧栏 + 可开合 Agent 侧栏
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 布局：
 * - 备忘录（/app · /app/notes/*）：窄图标轨 | 文件树+编辑器 | Agent（可选）
 * - 其它页：宽导航侧栏 | 主区 | Agent（可选）
 * - Agent 开合不遮挡编辑区：关时不占列宽
 */
import { useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAgentPanelStore } from "../shared/stores/agent-panel.store";
import { AgentPanel } from "../widgets/AgentPanel";
import { AppSidebar, type AppView } from "../widgets/AppSidebar";

function viewFromPath(pathname: string): AppView {
  if (pathname.startsWith("/app/profile")) return "profile";
  if (pathname.startsWith("/app/trash")) return "trash";
  if (pathname.startsWith("/app/new")) return "new";
  if (pathname.startsWith("/app/design")) return "design";
  // /app、/app/notes/*、其它默认视为备忘录工作区
  return "memos";
}

function pathFromView(view: AppView): string {
  switch (view) {
    case "new":
      return "/app/new";
    case "trash":
      return "/app/trash";
    case "profile":
      return "/app/profile";
    case "design":
      return "/app/design";
    case "memos":
    default:
      return "/app";
  }
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const agentOpen = useAgentPanelStore((s) => s.open);

  const activeView = useMemo(
    () => viewFromPath(location.pathname),
    [location.pathname],
  );

  const isMemoWorkspace = activeView === "memos";

  const gridTemplateColumns = (() => {
    if (isMemoWorkspace) {
      return agentOpen
        ? "var(--layout-rail) minmax(0, 1fr) var(--layout-agent)"
        : "var(--layout-rail) minmax(0, 1fr)";
    }
    return agentOpen
      ? "var(--layout-sidebar) minmax(0, 1fr) var(--layout-agent)"
      : "var(--layout-sidebar) minmax(0, 1fr)";
  })();

  return (
    <div className="h-dvh overflow-hidden bg-putty text-ink">
      <div
        className="grid h-full min-h-0"
        style={{ gridTemplateColumns }}
      >
        <AppSidebar
          activeView={activeView}
          variant={isMemoWorkspace ? "rail" : "full"}
          onViewChange={(view) => {
            navigate(pathFromView(view));
          }}
        />

        <div className="min-h-0 min-w-0 overflow-hidden">
          <Outlet />
        </div>

        {agentOpen ? <AgentPanel /> : null}
      </div>
    </div>
  );
}
