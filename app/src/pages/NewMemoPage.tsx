/**
 * [INPUT]: 依赖 React lazy/Suspense/useState、shared/ui Button、widgets/MdxMemoEditor
 * [OUTPUT]: 对外提供 NewMemoPage
 * [POS]: pages 新建备忘录视图；控件样式消费设计系统 token
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Save } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { Button } from "../shared/ui";

const MdxMemoEditor = lazy(() =>
  import("../widgets/MdxMemoEditor").then((module) => ({ default: module.MdxMemoEditor })),
);

export function NewMemoPage() {
  const [markdown, setMarkdown] = useState("");

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-paper text-ink">
      <header className="flex h-header shrink-0 items-center justify-between border-b border-vellum px-12 md:px-16">
        <input
          aria-label="备忘录标题"
          className="h-control-md min-w-0 flex-1 border-0 bg-transparent font-davinci text-title font-medium text-ink outline-none placeholder:text-graphite"
          placeholder="未命名备忘录"
        />
        <Button className="ml-10" size="sm" icon={<Save aria-hidden="true" />}>
          保存
        </Button>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto">
        <Suspense fallback={<div className="h-full bg-paper" />}>
          <MdxMemoEditor markdown={markdown} onChange={setMarkdown} />
        </Suspense>
      </section>
    </main>
  );
}
