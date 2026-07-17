/**
 * [INPUT]: 依赖 lucide-react、shared/ui LogoMark、UserMenu、react-router Link、agent-panel.store
 * [OUTPUT]: 对外提供 AppSidebar / AppIconRail 与 AppView
 * [POS]: widgets 全局导航；备忘录工作区用窄图标轨，其它页用宽侧栏；可切换 Agent 面板
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
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
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useAgentPanelStore } from "../shared/stores/agent-panel.store";
import { LogoMark } from "../shared/ui";
import { cn } from "../shared/ui/cn";
import { UserMenu } from "./UserMenu/UserMenu";

export type AppView = "new" | "memos" | "trash" | "profile" | "design";

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

type AppSidebarProps = {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  /**
   * rail：窄图标轨（备忘录工作区左侧留给文件树）
   * full：宽导航侧栏（新建/回收站/个人主页等）
   */
  variant?: "full" | "rail";
};

export function AppSidebar({
  activeView,
  onViewChange,
  variant = "full",
}: AppSidebarProps) {
  const items = useMemo(() => {
    if (!import.meta.env.DEV) {
      return baseSidebarItems;
    }
    return [...baseSidebarItems, designSidebarItem];
  }, []);

  const isProfileActive = activeView === "profile";
  const agentOpen = useAgentPanelStore((s) => s.open);
  const togglePanel = useAgentPanelStore((s) => s.togglePanel);

  if (variant === "rail") {
    return (
      <aside className="ds-app-rail flex h-full min-h-0 w-full min-w-0 flex-col items-center overflow-hidden border-r border-vellum bg-ink py-12 text-paper">
        <Link
          to="/"
          aria-label="返回 SuperNote 首页"
          className="flex size-control-md items-center justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-paper/50"
        >
          <LogoMark tone="paper" className="size-logo shrink-0" />
        </Link>

        <nav className="mt-16 flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto">
          <Link
            to="/"
            title="首页"
            aria-label="首页"
            className="flex size-control-md items-center justify-center rounded-sm text-paper hover:bg-paper/10"
          >
            <Home className="size-icon-sm" aria-hidden="true" />
          </Link>

          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeView;
            return (
              <button
                key={item.id}
                type="button"
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "flex size-control-md items-center justify-center rounded-sm",
                  isActive
                    ? "bg-paper text-ink"
                    : "text-paper hover:bg-paper/10",
                )}
              >
                <Icon className="size-icon-sm" aria-hidden="true" />
              </button>
            );
          })}

          <button
            type="button"
            title={agentOpen ? "关闭助手" : "打开助手"}
            aria-label={agentOpen ? "关闭助手" : "打开助手"}
            aria-pressed={agentOpen}
            onClick={togglePanel}
            className={cn(
              "flex size-control-md items-center justify-center rounded-sm",
              agentOpen
                ? "bg-paper text-ink"
                : "text-paper hover:bg-paper/10",
            )}
          >
            <Bot className="size-icon-sm" aria-hidden="true" />
          </button>
        </nav>

        <div className="mt-auto flex w-full flex-col items-center px-4">
          <UserMenu
            compact
            isProfileActive={isProfileActive}
            onOpenProfile={() => onViewChange("profile")}
          />
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden border-r border-vellum bg-ink px-10 py-12 text-paper">
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
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex h-control-md w-full min-w-0 items-center justify-between rounded-sm px-8 font-helvetica-now text-ui",
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

        <button
          type="button"
          onClick={togglePanel}
          aria-pressed={agentOpen}
          className={cn(
            "flex h-control-md w-full min-w-0 items-center justify-between rounded-sm px-8 font-helvetica-now text-ui",
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

      <UserMenu
        isProfileActive={isProfileActive}
        onOpenProfile={() => onViewChange("profile")}
      />
    </aside>
  );
}
