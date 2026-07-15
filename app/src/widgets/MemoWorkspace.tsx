/**
 * [INPUT]: 依赖 shared/ui 的 Button/Input/Textarea/Card，依赖 lucide-react 图标
 * [OUTPUT]: 对外提供 MemoWorkspace
 * [POS]: widgets 历史 Dashboard 主工作区；已迁移至本地设计系统
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { FolderTree, WandSparkles } from "lucide-react";

import { Button, Card, Input, Textarea } from "../shared/ui";

const memoCards = [
  { title: "未命名灵感", path: "待清洁 / 今天", status: "缺标题" },
  { title: "周会零散记录", path: "工作 / 会议", status: "可合并" },
  { title: "SuperNote 定价草案", path: "产品 / 商业化", status: "已归档" },
];

export function MemoWorkspace() {
  return (
    <main className="min-w-0 flex-1 bg-putty px-20 py-20 md:px-32 md:py-28">
      <header className="flex flex-col justify-between gap-20 border-b border-vellum pb-20 md:flex-row md:items-end">
        <div>
          <p className="font-helvetica-now text-ui font-medium uppercase text-graphite">
            Dashboard
          </p>
          <h1 className="mt-4 font-davinci text-heading-lg font-medium text-ink">
            您备忘录的保洁阿姨
          </h1>
        </div>
        <div className="flex gap-16 font-helvetica-now text-body-sm text-ink">
          <span>待整理: 12</span>
          <span>重复片段: 5</span>
          <span>已清洁: 128</span>
        </div>
      </header>

      <section className="grid gap-20 py-28 xl:grid-cols-[minmax(0,1fr)_minmax(0,var(--max-prose-xs))]">
        <Card className="p-20">
          <div className="flex items-center justify-between gap-16">
            <div>
              <p className="font-helvetica-now text-ui font-medium uppercase text-graphite">
                Quick Memo
              </p>
              <h2 className="mt-4 font-davinci text-heading-sm font-medium text-ink">
                新建备忘录
              </h2>
            </div>
            <Button icon={<WandSparkles aria-hidden="true" />}>模拟归档</Button>
          </div>

          <div className="mt-20 grid gap-16">
            <Input
              aria-label="备忘录标题"
              fieldSize="lg"
              placeholder="给这条备忘录一个标题"
            />
            <Textarea
              aria-label="备忘录内容"
              placeholder="先把想法倒进来，后面再让保洁阿姨分类、去重、放回正确抽屉。"
            />
          </div>
        </Card>

        <Card tone="ink" className="p-20">
          <div className="flex items-center gap-16">
            <FolderTree className="size-icon-sm" aria-hidden="true" />
            <h2 className="font-davinci text-heading-sm font-medium">归档预览</h2>
          </div>
          <div className="mt-20 space-y-16 font-helvetica-now text-body-sm">
            <div className="border-b border-paper/20 pb-16">
              <p>产品</p>
              <p className="text-paper/70">SuperNote / 定价 / 用户反馈</p>
            </div>
            <div className="border-b border-paper/20 pb-16">
              <p>工作</p>
              <p className="text-paper/70">会议 / 决策 / 后续动作</p>
            </div>
            <div>
              <p>个人</p>
              <p className="text-paper/70">读书 / 灵感 / 待办</p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-16 xl:grid-cols-3">
        {memoCards.map((memo) => (
          <Card key={memo.title} className="p-20">
            <div className="flex items-start justify-between gap-16">
              <h3 className="font-davinci text-subheading font-medium text-ink">
                {memo.title}
              </h3>
              <span className="rounded-sm border border-vellum px-4 py-4 font-helvetica-now text-ui text-graphite">
                {memo.status}
              </span>
            </div>
            <p className="mt-16 font-helvetica-now text-body-sm text-graphite">{memo.path}</p>
          </Card>
        ))}
      </section>
    </main>
  );
}
