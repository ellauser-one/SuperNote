/**
 * [INPUT]: 依赖 shared/ui Textarea
 * [OUTPUT]: 默认导出 Textarea 变体矩阵
 * [POS]: design-system/sections 的 Textarea 展示块（独立 chunk）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Textarea } from "../../../shared/ui";

export default function TextareaGallery() {
  return (
    <div className="grid gap-10">
      <label className="grid gap-4">
        <span className="font-helvetica-now text-meta text-graphite">default</span>
        <Textarea placeholder="Write a longer note…" aria-label="Default textarea" />
      </label>
      <label className="grid gap-4">
        <span className="font-helvetica-now text-meta text-graphite">disabled</span>
        <Textarea disabled placeholder="Disabled" aria-label="Disabled textarea" />
      </label>
    </div>
  );
}
