/**
 * [INPUT]: 依赖 React.lazy/memo/Suspense、useInView、GalleryEntry 元数据
 * [OUTPUT]: 对外提供 memo 化的 GalleryCell
 * [POS]: design-system 矩阵单元格；视口外只渲染占位，入屏后 lazy 挂载 section
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { lazy, memo, Suspense, useMemo } from "react";

import type { GalleryEntry } from "../registry";
import { useInView } from "./useInView";

type GalleryCellProps = {
  entry: GalleryEntry;
};

function GalleryCellComponent({ entry }: GalleryCellProps) {
  const { ref, inView } = useInView<HTMLElement>();

  const Section = useMemo(() => lazy(entry.load), [entry]);

  return (
    <article
      ref={ref}
      className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-vellum bg-paper"
    >
      <header className="shrink-0 border-b border-vellum px-12 py-8">
        <h2 className="font-davinci text-title font-medium text-ink">{entry.name}</h2>
        <p className="mt-2 truncate font-helvetica-now text-meta text-graphite">{entry.file}</p>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-12">
        {inView ? (
          <Suspense
            fallback={
              <div className="flex h-full min-h-control-xl items-center font-helvetica-now text-meta text-graphite">
                Loading {entry.name}…
              </div>
            }
          >
            <Section />
          </Suspense>
        ) : (
          <div
            className="min-h-control-xl rounded-md bg-chalk"
            aria-hidden="true"
          />
        )}
      </div>
    </article>
  );
}

export const GalleryCell = memo(GalleryCellComponent);
