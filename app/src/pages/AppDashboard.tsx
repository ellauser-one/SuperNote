/**
 * [INPUT]: 依赖 React useState/lazy/Suspense，依赖 widgets 与业务页面；DEV 下懒加载 design-system
 * [OUTPUT]: 对外提供 AppDashboard 路由页面
 * [POS]: pages /app 工作台；固定视口；含个人主页视图；DEV 视图挂载 Design System 画廊
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { lazy, Suspense, useState, type ComponentType } from "react";

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

  return (
    <div className="h-dvh overflow-hidden bg-putty text-ink">
      <div
        className="grid h-full min-h-0"
        style={{
          gridTemplateColumns:
            "var(--layout-sidebar) minmax(0, 1fr) var(--layout-agent)",
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
        <AgentPanel />
      </div>
    </div>
  );
}
