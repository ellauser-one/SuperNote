/**
 * [INPUT]: 依赖 React textarea 属性与 shared/ui/cn；样式真相来自 index.css 的 .ds-textarea
 * [OUTPUT]: 对外提供 Textarea 设计系统多行输入
 * [POS]: shared/ui 原子组件，供 pages/widgets 使用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { TextareaHTMLAttributes } from "react";

import { cn } from "./cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cn("ds-textarea", className)} {...props} />;
}
