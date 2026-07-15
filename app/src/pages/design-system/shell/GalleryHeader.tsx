/**
 * [INPUT]: 依赖 galleryEntries 长度
 * [OUTPUT]: 对外提供 GalleryHeader
 * [POS]: design-system 页顶栏；仅展示标题与数量，保持轻量
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
type GalleryHeaderProps = {
  count: number;
};

export function GalleryHeader({ count }: GalleryHeaderProps) {
  return (
    <header className="flex shrink-0 items-end justify-between gap-12 border-b border-vellum px-16 py-12">
      <div className="min-w-0">
        <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
          Dev only
        </p>
        <h1 className="font-davinci text-heading-sm font-medium text-ink">Design System</h1>
      </div>
      <p className="shrink-0 font-helvetica-now text-ui text-graphite">{count} components</p>
    </header>
  );
}
