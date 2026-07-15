/**
 * [INPUT]: 依赖 lucide-react、shared/ui LogoMark、UserMenu、react-router Link
 * [OUTPUT]: 对外提供 AppSidebar 与 AppView
 * [POS]: widgets 左侧导航；底部账户区委托 UserMenu；DEV 下追加 Design System 入口
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Home, Notebook, Palette, PenLine, Trash2, type LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { LogoMark } from "../shared/ui";
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
  { id: "memos", label: "备忘录", meta: "42 条", icon: Notebook },
  { id: "trash", label: "回收站", meta: "3 条", icon: Trash2 },
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
};

export function AppSidebar({ activeView, onViewChange }: AppSidebarProps) {
  const items = useMemo(() => {
    if (!import.meta.env.DEV) {
      return baseSidebarItems;
    }

    return [...baseSidebarItems, designSidebarItem];
  }, []);

  const isProfileActive = activeView === "profile";

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
          <span className="ml-4 shrink-0 truncate text-meta text-paper/60">Landing</span>
        </Link>

        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeView;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={`flex h-control-md w-full min-w-0 items-center justify-between rounded-sm px-8 font-helvetica-now text-ui ${
                isActive ? "bg-paper text-ink" : "text-paper hover:bg-paper/10"
              }`}
            >
              <span className="flex min-w-0 items-center gap-6">
                <Icon className="size-icon-xs shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </span>
              <span
                className={`ml-4 shrink-0 truncate text-meta ${
                  isActive ? "text-graphite" : "text-paper/60"
                }`}
              >
                {item.meta}
              </span>
            </button>
          );
        })}
      </nav>

      <UserMenu
        isProfileActive={isProfileActive}
        onOpenProfile={() => onViewChange("profile")}
      />
    </aside>
  );
}
