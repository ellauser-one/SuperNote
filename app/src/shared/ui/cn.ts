/**
 * [INPUT]: 接受 className 片段（string / false / null / undefined）
 * [OUTPUT]: 对外提供 cn 类名合并工具
 * [POS]: shared/ui 设计系统内部工具，仅用于组件 class 组合
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
