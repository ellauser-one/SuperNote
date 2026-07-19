/**
 * [INPUT]: 依赖 zustand create
 * [OUTPUT]: 对外提供 useSidebarStore + viewFromPath + pathFromView + PANEL_VIEWS
 * [POS]: shared/stores 薄 UI 状态；管导航视图 + 上下文面板开合
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 单向同步原则：URL 是唯一真相源
 * - URL 变化 → AppShell URL→Store effect 同步 activeView
 * - 点击导航 → AppSidebar 同时调 navigateTo(store) + navigate(URL)
 * - 禁止 Store→URL 反向 effect（会导致闭包陈旧值死循环）
 */
import { create } from "zustand";

export type AppView = "new" | "memos" | "trash" | "profile" | "design";

/** 哪些视图有上下文面板 */
export const PANEL_VIEWS: ReadonlySet<AppView> = new Set(["memos"]);

/** URL → AppView */
export function viewFromPath(pathname: string): AppView {
  if (pathname.startsWith("/app/profile")) return "profile";
  if (pathname.startsWith("/app/trash")) return "trash";
  if (pathname.startsWith("/app/new")) return "new";
  if (pathname.startsWith("/app/design")) return "design";
  return "memos";
}

/** AppView → URL */
export function pathFromView(view: AppView): string {
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

export type SidebarState = {
  /** 当前激活的视图 */
  activeView: AppView;
  /** 上下文面板是否展开 */
  panelOpen: boolean;
  /** 导航到指定视图；有面板的视图自动展开面板，再次点击同视图则切换面板 */
  navigateTo(view: AppView): void;
  /** 外部直接开关面板 */
  togglePanel(): void;
};

export const useSidebarStore = create<SidebarState>((set, get) => ({
  activeView: "memos",
  panelOpen: true,

  navigateTo: (view) => {
    const { activeView, panelOpen } = get();

    if (view === activeView && PANEL_VIEWS.has(view)) {
      set({ panelOpen: !panelOpen });
    } else if (PANEL_VIEWS.has(view)) {
      set({ activeView: view, panelOpen: true });
    } else {
      set({ activeView: view, panelOpen: false });
    }
  },

  togglePanel: () => {
    const { activeView } = get();
    if (PANEL_VIEWS.has(activeView)) {
      set((s) => ({ panelOpen: !s.panelOpen }));
    }
  },
}));
