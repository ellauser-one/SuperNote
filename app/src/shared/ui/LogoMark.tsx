/**
 * [INPUT]: 依赖 React SVG 属性；颜色与尺寸 token 来自 index.css
 * [OUTPUT]: 对外提供 LogoMark 品牌标记
 * [POS]: shared/ui 设计系统品牌组件，被 Landing Header 与 AppSidebar 复用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { SVGProps } from "react";

import { cn } from "./cn";

type LogoMarkProps = SVGProps<SVGSVGElement> & {
  tone?: "ink" | "paper";
};

export function LogoMark({ tone = "ink", className, ...props }: LogoMarkProps) {
  const strokeClass = tone === "paper" ? "stroke-paper" : "stroke-ink";
  const textClass = tone === "paper" ? "fill-paper" : "fill-ink";

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      className={cn("size-logo", className)}
      {...props}
    >
      <circle
        cx="16"
        cy="16"
        r="14.5"
        className={cn(strokeClass, "fill-transparent")}
        strokeWidth="1.5"
      />
      <text
        x="16"
        y="20"
        textAnchor="middle"
        className={cn(textClass, "font-davinci text-title font-medium")}
      >
        S
      </text>
    </svg>
  );
}
