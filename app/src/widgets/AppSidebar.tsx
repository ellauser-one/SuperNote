/**
 * [INPUT]: 依赖 lucide-react、shared/ui LogoMark、UserMenu、react-router Link/useNavigate/useLocation、
 *         sidebar.store、agent-panel.store
 * [OUTPUT]: 对外提供 AppSidebar（始终展开的宽导航侧栏）
 * [POS]: widgets 全局导航；永远显示在 AppShell 最左侧，固定宽度
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 交互：
 * - 点击导航项 → navigateTo(store) + navigate(URL) 双管齐下
 * - 再次点击已激活的有面板导航项 → 只切换 panelOpen，不导航
 */
import {
  Bot,
  Home,
  Notebook,
  Palette,
  PenLine,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAgentPanelStore } from "../shared/stores/agent-panel.store";
import {
  pathFromView,
  useSidebarStore,
  viewFromPath,
  type AppView,
} from "../shared/stores/sidebar.store";
import { LogoMark } from "../shared/ui";
import { cn } from "../shared/ui/cn";
import { UserMenu } from "./UserMenu/UserMenu";

export type { AppView } from "../shared/stores/sidebar.store";

type SidebarItem = {
  id: AppView;
  label: string;
  meta: string;
  icon: LucideIcon;
  devOnly?: boolean;
};

const baseSidebarItems: SidebarItem[] = [
  { id: "new", label: "新建", meta: "快速记录", icon: PenLine },
  { id: "memos", label: "备忘录", meta: "文件树", icon: Notebook },
  { id: "trash", label: "回收站", meta: "已删除", icon: Trash2 },
];

const designSidebarItem: SidebarItem = {
  id: "design",
  label: "Design System",
  meta: "DEV",
  icon: Palette,
  devOnly: true,
};

export function AppSidebar() {
  const items = useMemo(() => {
    if (!import.meta.env.DEV) return baseSidebarItems;
    return [...baseSidebarItems, designSidebarItem];
  }, []);

  const activeView = useSidebarStore((s) => s.activeView);
  const navigateToStore = useSidebarStore((s) => s.navigateTo);
  const isProfileActive = activeView === "profile";

  const agentOpen = useAgentPanelStore((s) => s.open);
  const toggleAgent = useAgentPanelStore((s) => s.togglePanel);

  const navigate = useNavigate();
  const location = useLocation();

  /* ── 导航处理：store + URL 双管齐下 ─────────────────────── */
  const handleNavigate = useCallback(
    (view: AppView) => {
      navigateToStore(view);
      // 只在目标路径与当前不一致时才导航（避免同视图 toggle 时的冗余跳转）
      const targetPath = pathFromView(view);
      const currentView = viewFromPath(location.pathname);
      if (currentView !== view) {
        navigate(targetPath);
      }
    },
    [navigateToStore, navigate, location.pathname],
  );

  return (
    <aside className="ds-sidebar flex h-full min-h-0 flex-col overflow-hidden border-r border-vellum bg-ink px-10 py-12 text-paper">
      {/* Logo */}
      <Link
        to="/"
        aria-label="返回 SuperNote 首页"
        className="flex min-w-0 items-center gap-8 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-paper/50"
      >
        <LogoMark tone="paper" className="size-logo shrink-0" />
        <div className="min-w-0">
          <p className="truncate font-helvetica-now text-ui font-medium uppercase text-paper">
            SuperNote
          </p>
          <p className="truncate font-helvetica-now text-meta text-paper/70">
            备忘录清洁台
          </p>
        </div>
      </Link>

      {/* 导航 */}
      <nav className="mt-16 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        <Link
          to="/"
          className="flex h-control-md w-full min-w-0 items-center justify-between rounded-sm px-8 font-helvetica-now text-ui text-paper hover:bg-paper/10"
        >
          <span className="flex min-w-0 items-center gap-6">
            <Home className="size-icon-xs shrink-0" aria-hidden="true" />
            <span className="truncate">首页</span>
          </span>
          <span className="ml-4 shrink-0 truncate text-meta text-paper/60">
            Landing
          </span>
        </Link>

        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeView;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-control-md w-full min-w-0 items-center justify-between rounded-sm px-8 font-helvetica-now text-ui transition-colors duration-150",
                isActive
                  ? "bg-paper text-ink"
                  : "text-paper hover:bg-paper/10",
              )}
            >
              <span className="flex min-w-0 items-center gap-6">
                <Icon className="size-icon-xs shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </span>
              <span
                className={cn(
                  "ml-4 shrink-0 truncate text-meta",
                  isActive ? "text-graphite" : "text-paper/60",
                )}
              >
                {item.meta}
              </span>
            </button>
          );
        })}

        {/* 助手 */}
        <button
          type="button"
          onClick={toggleAgent}
          aria-pressed={agentOpen}
          className={cn(
            "flex h-control-md w-full min-w-0 items-center justify-between rounded-sm px-8 font-helvetica-now text-ui transition-colors duration-150",
            agentOpen ? "bg-paper text-ink" : "text-paper hover:bg-paper/10",
          )}
        >
          <span className="flex min-w-0 items-center gap-6">
            <Bot className="size-icon-xs shrink-0" aria-hidden="true" />
            <span className="truncate">助手</span>
          </span>
          <span
            className={cn(
              "ml-4 shrink-0 truncate text-meta",
              agentOpen ? "text-graphite" : "text-paper/60",
            )}
          >
            {agentOpen ? "开" : "关"}
          </span>
        </button>
      </nav>

      {/* 底部用户 */}
      <UserMenu
        isProfileActive={isProfileActive}
        onOpenProfile={() => handleNavigate("profile")}
      />
    </aside>
  );
}
