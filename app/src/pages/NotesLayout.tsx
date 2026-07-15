/**
 * [INPUT]: 依赖 react-router useParams/Outlet，依赖 widgets/MemoTree/MemoTree、
 *         widgets/AgentPanel、shared/stores/memo-tree.store、shared/types/memo
 * [OUTPUT]: 对外提供 NotesLayout 路由页面（树侧栏 + 编辑区 + Agent 面板三栏布局）
 * [POS]: pages /app 主布局；子路由 /app/notes/:noteId 通过 Outlet 注入编辑器
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { MemoTree } from "../widgets/MemoTree/MemoTree";
import { AgentPanel } from "../widgets/AgentPanel";
import { useMemoTreeStore } from "../shared/stores/memo-tree.store";
import { findNode } from "../shared/lib/memo-tree-helpers";
import type { MemoTreeNode } from "../shared/types/memo";

/* -------------------------------------------------------------------------- */
/* 空选择态                                                                     */
/* -------------------------------------------------------------------------- */

function EmptyState({ onCreateFirst }: { onCreateFirst: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-12 font-helvetica-now text-ui text-graphite">
      <p>选择一条备忘录开始编辑</p>
      <button
        type="button"
        className="ds-tree-context-menu__item"
        onClick={onCreateFirst}
      >
        或创建第一条备忘录
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 简易内联编辑器（选中 memo 时展示）                                            */
/* -------------------------------------------------------------------------- */

function InlineMemoView({ node }: { node: MemoTreeNode }) {
  const updateLocal = useMemoTreeStore((s) => s.updateMemoContentLocal);
  const saveContent = useMemoTreeStore((s) => s.saveMemoContent);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-paper">
      <header className="flex shrink-0 items-center border-b border-vellum px-20 py-12">
        <h1 className="font-davinci text-title-lg font-medium text-ink">
          {node.title}
        </h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-20 py-16">
        <textarea
          className="ds-textarea h-full resize-none"
          value={node.memo?.content_mdx ?? ""}
          onChange={(e) => updateLocal(node.id, e.target.value)}
          onBlur={(e) => {
            void saveContent(node.id, e.target.value);
          }}
          placeholder="在这里记录想法…"
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 布局主体                                                                     */
/* -------------------------------------------------------------------------- */

export function NotesLayout() {
  const { noteId } = useParams<{ noteId: string }>();
  const nodes = useMemoTreeStore((s) => s.nodes);
  const createMemo = useMemoTreeStore((s) => s.createMemo);
  const navigate = useNavigate();

  const activeNode = useMemo(() => {
    if (!noteId) return null;
    return findNode(nodes, noteId);
  }, [noteId, nodes]);

  /** 空树：自动创建根级 memo */
  const handleCreateFirst = useCallback(async () => {
    try {
      const node = await createMemo({
        parent_id: null,
        title: "未命名备忘录",
      });
      navigate(`/app/notes/${node.id}`, { replace: true });
    } catch {
      /* store 已回滚 */
    }
  }, [createMemo, navigate]);

  /* 有 noteId 但找不到对应节点 → 空选择态 */
  const showEmpty = noteId && !activeNode;
  /* 无 noteId → 空选择态 */
  const showIdle = !noteId;

  return (
    <div className="h-dvh overflow-hidden bg-putty text-ink">
      <div
        className="grid h-full min-h-0"
        style={{
          gridTemplateColumns:
            "minmax(var(--layout-tree-min), var(--layout-tree)) minmax(0, 1fr) var(--layout-agent)",
        }}
      >
        {/* 左侧文件树 */}
        <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-vellum bg-chalk">
          <div className="flex shrink-0 items-center justify-between gap-8 border-b border-vellum px-12 py-10">
            <div className="min-w-0">
              <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
                Memo Tree
              </p>
              <h1 className="truncate font-davinci text-title font-medium">
                备忘录
              </h1>
            </div>
          </div>
          <MemoTree />
        </aside>

        {/* 中间内容区 */}
        <div className="min-h-0 min-w-0 overflow-hidden">
          {activeNode && activeNode.node_type === "memo" ? (
            <InlineMemoView node={activeNode} />
          ) : showEmpty || showIdle ? (
            <EmptyState onCreateFirst={handleCreateFirst} />
          ) : (
            <EmptyState onCreateFirst={handleCreateFirst} />
          )}
        </div>

        {/* 右侧 Agent 面板 */}
        <AgentPanel />
      </div>
    </div>
  );
}
