/**
 * [INPUT]: 依赖 react-router useParams/useNavigate、useAuth、
 *         widgets/MemoTree、widgets/MemoEditorView、shared/stores/memo-tree.store、
 *         shared/lib/memo-tree-helpers、shared/lib/last-opened-memo
 * [OUTPUT]: 对外提供 NotesLayout（文件树主侧栏 + 编辑区）
 * [POS]: pages /app 与 /app/notes/:noteId 主内容区
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 进入 /app 时：
 * 1. 等 GET /memo-tree 成功
 * 2. 有 last-opened memo → replace 到 /app/notes/:id
 * 3. 完全无节点 → 自动创建根级 memo 并打开
 * 4. 有节点但 last memo 不存在 → 空选择态（不显示假编辑器）
 *
 * 正文编辑与无感知自动保存委托 widgets/MemoEditorView。
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../app/providers/AuthProvider";
import {
  getLastOpenedMemo,
  setLastOpenedMemo,
} from "../shared/lib/last-opened-memo";
import { findNode } from "../shared/lib/memo-tree-helpers";
import { useMemoTreeStore } from "../shared/stores/memo-tree.store";
import { MemoEditorView } from "../widgets/MemoEditorView";
import { MemoTree } from "../widgets/MemoTree/MemoTree";

/* -------------------------------------------------------------------------- */
/* 空选择态                                                                     */
/* -------------------------------------------------------------------------- */

function EmptyState({ onCreateFirst }: { onCreateFirst: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-12 font-helvetica-now text-ui text-graphite">
      <p>选择左侧一条备忘录开始编辑</p>
      <p className="max-w-prose-xs text-center text-meta">
        用顶部「新建文件夹 / 新建备忘录」，或在树空白处右键创建
      </p>
      <button
        type="button"
        className="ds-tree-toolbar__btn"
        onClick={onCreateFirst}
      >
        创建第一条备忘录
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 布局主体：文件树主侧栏 + 编辑区                                               */
/* -------------------------------------------------------------------------- */

export function NotesLayout() {
  const { noteId } = useParams<{ noteId: string }>();
  const { user } = useAuth();
  const nodes = useMemoTreeStore((s) => s.nodes);
  const loading = useMemoTreeStore((s) => s.loading);
  const fetchTree = useMemoTreeStore((s) => s.fetchTree);
  const createMemo = useMemoTreeStore((s) => s.createMemo);
  const reset = useMemoTreeStore((s) => s.reset);
  const navigate = useNavigate();

  /**
   * 同一 user 只成功 bootstrap 一次。
   * 成功后才写入 ref，避免 React Strict Mode 首轮 abort 后第二轮被跳过。
   */
  const bootstrappedUserRef = useRef<string | null>(null);
  /** 捕获首次挂载时的 noteId，避免 bootstrap 过程中路由变化干扰空树引导 */
  const initialNoteIdRef = useRef(noteId);

  const activeNode = useMemo(() => {
    if (!noteId) return null;
    return findNode(nodes, noteId);
  }, [noteId, nodes]);

  /* ── 登录用户变化：拉树 + 路由引导 ─────────────────────────── */
  useEffect(() => {
    if (!user?.id) {
      bootstrappedUserRef.current = null;
      reset();
      return;
    }

    if (bootstrappedUserRef.current === user.id) return;

    const controller = new AbortController();
    let cancelled = false;
    const entryNoteId = initialNoteIdRef.current;

    void (async () => {
      try {
        const tree = await fetchTree(controller.signal);
        if (cancelled) return;

        // 已在具体 note 路由：只记 last-opened，不强制跳转
        if (entryNoteId) {
          const existing = findNode(tree, entryNoteId);
          if (existing?.node_type === "memo") {
            setLastOpenedMemo(user.id, entryNoteId);
          }
          bootstrappedUserRef.current = user.id;
          return;
        }

        // 进入 /app：按 last-opened / 空树策略引导
        const lastId = getLastOpenedMemo(user.id);
        if (lastId && findNode(tree, lastId)?.node_type === "memo") {
          navigate(`/app/notes/${lastId}`, { replace: true });
          bootstrappedUserRef.current = user.id;
          return;
        }

        if (tree.length === 0) {
          const existingRoots = useMemoTreeStore.getState().nodes;
          if (existingRoots.length > 0) {
            bootstrappedUserRef.current = user.id;
            return;
          }

          const node = await createMemo({
            parent_id: null,
            title: "未命名备忘录",
          });
          if (cancelled) return;
          setLastOpenedMemo(user.id, node.id);
          navigate(`/app/notes/${node.id}`, { replace: true });
          bootstrappedUserRef.current = user.id;
          return;
        }

        // 有节点但 last memo 不存在 → 停在 /app 空选择态
        bootstrappedUserRef.current = user.id;
      } catch {
        // abort / 网络：允许下次再试（成功前未写入 ref）
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [user?.id, fetchTree, createMemo, reset, navigate]);

  /* ── 打开 memo 时按 user 记录 last-opened ─────────────────── */
  useEffect(() => {
    if (!user?.id || !noteId) return;
    if (activeNode?.node_type === "memo") {
      setLastOpenedMemo(user.id, noteId);
    }
  }, [user?.id, noteId, activeNode]);

  const handleCreateFirst = useCallback(async () => {
    if (!user?.id) return;
    try {
      const node = await createMemo({
        parent_id: null,
        title: "未命名备忘录",
      });
      setLastOpenedMemo(user.id, node.id);
      navigate(`/app/notes/${node.id}`, { replace: true });
    } catch {
      /* store 已处理错误 */
    }
  }, [createMemo, navigate, user?.id]);

  const handleMemoOpened = useCallback(
    (nodeId: string) => {
      if (user?.id) setLastOpenedMemo(user.id, nodeId);
    },
    [user?.id],
  );

  const showEmpty = !noteId || !activeNode || activeNode.node_type !== "memo";
  const showLoading = loading && nodes.length === 0;

  return (
    <div
      className="grid h-full min-h-0"
      style={{
        gridTemplateColumns:
          "minmax(var(--layout-tree-min), var(--layout-tree)) minmax(0, 1fr)",
      }}
    >
      {/* 文件树 = 备忘录工作区主侧栏（文件夹 + 备忘录） */}
      <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-vellum bg-chalk">
        <MemoTree onMemoOpened={handleMemoOpened} />
      </aside>

      {/* 编辑区 */}
      <div className="min-h-0 min-w-0 overflow-hidden">
        {showLoading ? (
          <div className="flex h-full items-center justify-center font-helvetica-now text-ui text-graphite">
            加载中…
          </div>
        ) : activeNode && activeNode.node_type === "memo" ? (
          <MemoEditorView node={activeNode} />
        ) : showEmpty ? (
          <EmptyState onCreateFirst={handleCreateFirst} />
        ) : null}
      </div>
    </div>
  );
}
