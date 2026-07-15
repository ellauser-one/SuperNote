/**
 * [INPUT]: 依赖 galleryEntries 与 GalleryCell
 * [OUTPUT]: 对外提供 GalleryMatrix 响应式网格
 * [POS]: design-system 矩阵布局；单元格各自视口懒加载
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { GalleryCell } from "../cell/GalleryCell";
import { galleryEntries } from "../registry";

export function GalleryMatrix() {
  return (
    <div className="grid auto-rows-fr gap-12 p-16 md:grid-cols-2 xl:grid-cols-3">
      {galleryEntries.map((entry) => (
        <GalleryCell key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
