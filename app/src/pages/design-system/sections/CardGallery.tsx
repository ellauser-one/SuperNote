/**
 * [INPUT]: 依赖 shared/ui Card
 * [OUTPUT]: 默认导出 Card tone 矩阵
 * [POS]: design-system/sections 的 Card 展示块（独立 chunk）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Card } from "../../../shared/ui";

const tones = ["bone", "chalk", "paper", "ink"] as const;

export default function CardGallery() {
  return (
    <div className="grid grid-cols-2 gap-8">
      {tones.map((tone) => (
        <Card key={tone} tone={tone} className="p-10">
          <p className="font-helvetica-now text-ui font-medium">tone={tone}</p>
          <p className="mt-4 font-helvetica-now text-meta opacity-70">Card surface</p>
        </Card>
      ))}
    </div>
  );
}
