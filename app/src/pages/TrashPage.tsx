/**
 * [INPUT]: 依赖 lucide-react 图标
 * [OUTPUT]: 对外提供 TrashPage
 * [POS]: pages 回收站紧凑列表；列宽与字号 token 来自 index.css
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { RotateCcw, Trash2 } from "lucide-react";

const trashedMemos = [
  {
    id: "duplicate-pricing",
    title: "旧定价重复草稿",
    path: "产品 / 商业化",
    deletedAt: "今天 08:12",
    excerpt: "早期价格假设已被新版三档定价替换。",
  },
  {
    id: "empty-inbox",
    title: "空标题随手记",
    path: "Inbox",
    deletedAt: "昨天 21:44",
    excerpt: "只有一个链接，没有上下文，已被合并到用户研究。",
  },
  {
    id: "old-meeting",
    title: "过期会议提醒",
    path: "工作 / 会议",
    deletedAt: "6 月 30 日",
    excerpt: "行动项已完成，保留价值低。",
  },
];

export function TrashPage() {
  return (
    <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-putty px-16 py-12 text-ink md:px-20">
      <header className="flex shrink-0 items-end justify-between gap-12 border-b border-vellum pb-10">
        <div className="min-w-0">
          <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
            Trash
          </p>
          <h1 className="font-davinci text-subheading font-medium">回收站</h1>
        </div>
        <p className="shrink-0 font-helvetica-now text-ui text-graphite">
          {trashedMemos.length} 条
        </p>
      </header>

      <section className="mt-12 min-h-0 flex-1 overflow-y-auto rounded-md border border-vellum bg-bone">
        <div
          className="sticky top-0 grid border-b border-vellum bg-bone px-10 py-6 font-helvetica-now text-label uppercase text-graphite"
          style={{
            gridTemplateColumns:
              "minmax(0, 1fr) var(--layout-trash-date) var(--layout-trash-action)",
          }}
        >
          <span>Memo</span>
          <span>Deleted</span>
          <span className="text-right">Action</span>
        </div>

        {trashedMemos.map((memo) => (
          <article
            key={memo.id}
            className="grid items-center gap-8 border-b border-vellum px-10 py-6 last:border-b-0"
            style={{
              gridTemplateColumns:
                "minmax(0, 1fr) var(--layout-trash-date) var(--layout-trash-action)",
            }}
          >
            <div className="flex min-w-0 items-center gap-6">
              <Trash2 className="size-icon-xs shrink-0 text-graphite" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="truncate font-helvetica-now text-ui font-medium text-ink">
                  {memo.title}
                </h2>
                <p className="mt-2 truncate font-helvetica-now text-meta text-graphite">
                  {memo.path}
                  <span className="mx-4 text-vellum">·</span>
                  {memo.excerpt}
                </p>
              </div>
            </div>

            <p className="truncate font-helvetica-now text-meta text-graphite">
              {memo.deletedAt}
            </p>

            <button
              type="button"
              className="inline-flex h-row w-full items-center justify-end gap-4 font-helvetica-now text-meta font-medium text-ink hover:underline"
            >
              <RotateCcw className="size-icon-xs" aria-hidden="true" />
              恢复
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
