/**
 * [INPUT]: 依赖 react、zustand、shared/ui/cn
 * [OUTPUT]: 对外提供 showToast（命令式调用）/ ToastViewport（挂载一次）
 * [POS]: shared/ui 轻量全局反馈层；AI 分类、反馈提交等闭环的结果提示
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 设计：极简 zustand store + 固定底部居中视口；样式全部来自 index.css .ds-toast*
 * 禁止第三方 toast 库
 */
import { create } from "zustand";

import { cn } from "./cn";

export type ToastKind = "info" | "success" | "error";

type ToastItem = {
  id: number;
  message: string;
  kind: ToastKind;
};

type ToastStore = {
  items: ToastItem[];
  push: (message: string, kind: ToastKind) => void;
  dismiss: (id: number) => void;
};

let nextToastId = 0;
const TOAST_TTL_MS = 4000;

export const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (message, kind) => {
    const id = ++nextToastId;
    set((s) => ({ items: [...s.items, { id, message, kind }] }));
    window.setTimeout(() => {
      set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
    }, TOAST_TTL_MS);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

/** 命令式触发一条 toast；任意组件/模块可调用，无需持有 context */
export function showToast(message: string, kind: ToastKind = "info"): void {
  useToastStore.getState().push(message, kind);
}

export function ToastViewport() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="ds-toast-viewport" role="region" aria-live="polite">
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          className={cn("ds-toast", `ds-toast--${t.kind}`)}
          onClick={() => dismiss(t.id)}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
