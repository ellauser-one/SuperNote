/**
 * [INPUT]: 依赖 GalleryHeader/GalleryMatrix；仅在 DEV 视图挂载
 * [OUTPUT]: 对外提供 DesignSystemPage
 * [POS]: pages/design-system 页面壳；自身保持轻量，组件展示全部分区懒加载
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { galleryEntries } from "./registry";
import { GalleryHeader } from "./shell/GalleryHeader";
import { GalleryMatrix } from "./shell/GalleryMatrix";

export function DesignSystemPage() {
  return (
    <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-putty text-ink">
      <GalleryHeader count={galleryEntries.length} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <GalleryMatrix />
      </div>
    </main>
  );
}
