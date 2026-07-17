/**
 * [INPUT]: 依赖 zustand create
 * [OUTPUT]: 对外提供 useAgentPanelStore（open / openPanel / closePanel / togglePanel）
 * [POS]: shared/stores 薄 UI 状态；只管面板开/关，不镜像对话消息
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { create } from "zustand";

export type AgentPanelState = {
  /** 右侧助手面板是否展开 */
  open: boolean;
  openPanel(): void;
  closePanel(): void;
  togglePanel(): void;
};

export const useAgentPanelStore = create<AgentPanelState>((set) => ({
  open: true,
  openPanel: () => set({ open: true }),
  closePanel: () => set({ open: false }),
  togglePanel: () => set((s) => ({ open: !s.open })),
}));
