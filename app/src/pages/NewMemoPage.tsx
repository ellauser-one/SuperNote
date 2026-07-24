/**
 * [INPUT]: 依赖 React lazy/Suspense/useState、shared/ui Button、
 *         shared/stores/memo-tree.store.createMemo、react-router useNavigate、
 *         widgets/MdxMemoEditor
 * [OUTPUT]: 对外提供 NewMemoPage（受控标题 + 正文，保存创建备忘录后跳转到 /app/notes/:id）
 * [POS]: pages 新建备忘录视图；控件样式消费设计系统 token
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Save } from "lucide-react";
import { lazy, Suspense, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useMemoTreeStore } from "../shared/stores/memo-tree.store";
import { Button } from "../shared/ui";

const MdxMemoEditor = lazy(() =>
  import("../widgets/MdxMemoEditor").then((module) => ({ default: module.MdxMemoEditor })),
);

export function NewMemoPage() {
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMemo = useMemoTreeStore((s) => s.createMemo);
  const navigate = useNavigate();

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const node = await createMemo({
        parent_id: null,
        title: title.trim() || "未命名备忘录",
        content_mdx: markdown,
      });
      navigate(`/app/notes/${node.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试。");
    } finally {
      setSaving(false);
    }
  }, [saving, title, markdown, createMemo, navigate]);

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-paper text-ink">
      <header className="flex h-header shrink-0 items-center justify-between gap-10 border-b border-vellum px-12 md:px-16">
        <input
          aria-label="备忘录标题"
          className="h-control-md min-w-0 flex-1 border-0 bg-transparent font-davinci text-title font-medium text-ink outline-none placeholder:text-graphite"
          placeholder="未命名备忘录"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button
          className="ml-10"
          size="sm"
          icon={<Save aria-hidden="true" />}
          loading={saving}
          onClick={handleSave}
        >
          保存
        </Button>
      </header>

      {error ? (
        <p className="px-12 py-8 font-helvetica-now text-meta text-graphite" role="alert">
          {error}
        </p>
      ) : null}

      <section className="min-h-0 flex-1 overflow-y-auto">
        <Suspense fallback={<div className="h-full bg-paper" />}>
          <MdxMemoEditor markdown={markdown} onChange={setMarkdown} />
        </Suspense>
      </section>
    </main>
  );
}
