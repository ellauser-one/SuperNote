/**
 * [INPUT]: 依赖 React useState/lazy/Suspense，依赖 widgets 与业务页面；DEV 下懒加载 design-system
 * [OUTPUT]: 对外提供 AppDashboard 路由页面
 * [POS]: pages 历史工作台（主路径已由 AppShell 替代）；含 Agent 侧栏开合
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { lazy, Suspense, useState, type ComponentType } from "react";

import { useAgentPanelStore } from "../shared/stores/agent-panel.store";
import { AgentPanel } from "../widgets/AgentPanel";
import { AppSidebar, type AppView } from "../widgets/AppSidebar";
import { MemoLibraryPage } from "./MemoLibraryPage";
import { NewMemoPage } from "./NewMemoPage";
import { ProfilePage } from "./ProfilePage";
import { TrashPage } from "./TrashPage";

const DesignSystemPage: ComponentType | null = import.meta.env.DEV
  ? lazy(() =>
      import("./design-system").then((module) => ({
        default: module.DesignSystemPage,
      })),
    )
  : null;

export function AppDashboard() {
  const [activeView, setActiveView] = useState<AppView>("new");
  const agentOpen = useAgentPanelStore((s) => s.open);

  return (
    <div className="h-dvh overflow-hidden bg-putty text-ink">
      <div
        className="grid h-full min-h-0"
        style={{
          gridTemplateColumns: agentOpen
            ? "var(--layout-sidebar) minmax(0, 1fr) var(--layout-agent)"
            : "var(--layout-sidebar) minmax(0, 1fr)",
        }}
      >
        <AppSidebar activeView={activeView} onViewChange={setActiveView} />
        <div className="min-h-0 min-w-0 overflow-hidden">
          {activeView === "new" ? <NewMemoPage /> : null}
          {activeView === "memos" ? <MemoLibraryPage /> : null}
          {activeView === "trash" ? <TrashPage /> : null}
          {activeView === "profile" ? <ProfilePage /> : null}
          {import.meta.env.DEV && activeView === "design" && DesignSystemPage ? (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center bg-putty font-helvetica-now text-ui text-graphite">
                  Loading Design System…
                </div>
              }
            >
              <DesignSystemPage />
            </Suspense>
          ) : null}
        </div>
        {agentOpen ? <AgentPanel /> : null}
      </div>
    </div>
  );
}
