/**
 * [INPUT]: 依赖 shared/ui LogoMark
 * [OUTPUT]: 默认导出 LogoMark tone 矩阵
 * [POS]: design-system/sections 的 LogoMark 展示块（独立 chunk）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { LogoMark } from "../../../shared/ui";

export default function LogoMarkGallery() {
  return (
    <div className="grid grid-cols-2 gap-10">
      <div className="flex flex-col items-start gap-6 rounded-md bg-paper p-10">
        <LogoMark tone="ink" />
        <p className="font-helvetica-now text-meta text-graphite">tone=ink</p>
      </div>
      <div className="flex flex-col items-start gap-6 rounded-md bg-ink p-10">
        <LogoMark tone="paper" />
        <p className="font-helvetica-now text-meta text-paper/70">tone=paper</p>
      </div>
    </div>
  );
}
