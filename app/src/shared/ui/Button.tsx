/**
 * [INPUT]: 依赖 React 按钮属性与 shared/ui/cn；质感/loading 样式来自 index.css .ds-button*
 * [OUTPUT]: 对外提供 Button（primary/outline/ghost/inverse · sm/md · loading · flat）
 * [POS]: shared/ui 核心吸睛原子；ghost 为半透明幽灵面；flat 为工具型扁平紧凑按钮；loading 含转圈 + shimmer
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

type ButtonVariant = "primary" | "outline" | "ghost" | "inverse";
type ButtonSize = "sm" | "md";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  /** 加载态：转圈 + shimmer，并阻断点击 */
  loading?: boolean;
  /** 工具型扁平按钮：无阴影/渐变/磨砂，仅保留轻边框与 hover 背景变化 */
  flat?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  flat = false,
  className,
  type = "button",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      className={cn(
        "ds-button",
        variant === "primary" && "ds-button--primary",
        variant === "outline" && "ds-button--outline",
        variant === "ghost" && "ds-button--ghost",
        variant === "inverse" && "ds-button--inverse",
        size === "sm" && "ds-button--sm",
        size === "md" && "ds-button--md",
        loading && "ds-button--loading",
        flat && "ds-button--flat",
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="ds-button__spinner" aria-hidden="true" />
      ) : icon ? (
        <span className="ds-button__icon">{icon}</span>
      ) : null}
      {children ? <span className="ds-button__label">{children}</span> : null}
    </button>
  );
}
