/**
 * [INPUT]: 依赖 React HTML 属性与 shared/ui/cn；样式真相来自 index.css 的 .ds-card*
 * [OUTPUT]: 对外提供 Card 设计系统卡片表面
 * [POS]: shared/ui 原子组件，替代第三方 LayerCard
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { HTMLAttributes } from "react";

import { cn } from "./cn";

type CardTone = "bone" | "ink" | "chalk" | "paper";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: CardTone;
};

export function Card({ tone = "bone", className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "ds-card",
        tone === "ink" && "ds-card--ink",
        tone === "chalk" && "ds-card--chalk",
        tone === "paper" && "ds-card--paper",
        className,
      )}
      {...props}
    />
  );
}
