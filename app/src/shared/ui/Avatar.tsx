/**
 * [INPUT]: 依赖 React img 属性与 shared/ui/cn；尺寸/表面样式来自 index.css .ds-avatar*
 * [OUTPUT]: 对外提供 Avatar（sm/md/lg/xl · src 图片或 fallback 字标）
 * [POS]: shared/ui 原子组件；真圆形，仅头像用途
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { ImgHTMLAttributes } from "react";

import { cn } from "./cn";

type AvatarSize = "sm" | "md" | "lg" | "xl";
type AvatarTone = "default" | "on-ink";

export type AvatarProps = {
  size?: AvatarSize;
  /** default：浅色表面；on-ink：深色侧栏等 ink 表面 */
  tone?: AvatarTone;
  /** 头像图片 URL；缺省时显示 fallback */
  src?: string | null;
  alt?: string;
  /** 无图时的字标（通常 1–2 个字符） */
  fallback?: string;
  className?: string;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "className" | "width" | "height">;

function normalizeFallback(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return "?";
  }

  // 优先取首字；中文等单字友好
  return trimmed.slice(0, 2);
}

export function Avatar({
  size = "md",
  tone = "default",
  src,
  alt = "",
  fallback,
  className,
  ...imgProps
}: AvatarProps) {
  const hasImage = Boolean(src);

  return (
    <span
      className={cn(
        "ds-avatar",
        size === "sm" && "ds-avatar--sm",
        size === "md" && "ds-avatar--md",
        size === "lg" && "ds-avatar--lg",
        size === "xl" && "ds-avatar--xl",
        tone === "on-ink" && "ds-avatar--on-ink",
        className,
      )}
      role={hasImage ? undefined : "img"}
      aria-label={hasImage ? undefined : alt || fallback || "用户头像"}
    >
      {hasImage ? (
        <img
          src={src ?? undefined}
          alt={alt}
          className="ds-avatar__image"
          draggable={false}
          {...imgProps}
        />
      ) : (
        <span className="ds-avatar__fallback" aria-hidden="true">
          {normalizeFallback(fallback)}
        </span>
      )}
    </span>
  );
}
