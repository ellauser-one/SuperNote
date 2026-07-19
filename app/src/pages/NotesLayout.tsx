/**
 * [INPUT]: 依赖 react-router useParams/useNavigate、useAuth、
 *         shared/stores/memo-tree.store、shared/lib/memo-tree-helpers、
 *         shared/lib/last-opened-memo、widgets/MemoEditorView
 * [OUTPUT]: 对外提供 NotesLayout（纯编辑区，文件树由全局 ContextPanel 承载）
 * [POS]: pages /app 与 /app/notes/:noteId 主内容区
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 进入 /app 时：
 * 1. 等 GET /memo-tree 成功
 * 2. 有 last-opened memo → replace 到 /app/notes/:id
 * 3. 完全无节点 → 自动创建根级 memo 并打开
 * 4. 有节点但 last memo 不存在 → 空选择态
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

/* -------------------------------------------------------------------------- */
/* 空选择态                                                                     */
/* -------------------------------------------------------------------------- */

function EmptyState({ onCreateFirst }: { onCreateFirst: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 font-helvetica-now text-ui text-graphite">
      <p>选择备忘录开始编辑</p>
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
/* 布局主体：纯编辑区（文件树在 ContextPanel）                                   */
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

  const bootstrappedUserRef = useRef<string | null>(null);
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

        if (entryNoteId) {
          const existing = findNode(tree, entryNoteId);
          if (existing?.node_type === "memo") {
            setLastOpenedMemo(user.id, entryNoteId);
          }
          bootstrappedUserRef.current = user.id;
          return;
        }

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

        bootstrappedUserRef.current = user.id;
      } catch {
        /* abort / 网络：允许下次再试 */
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

  const showEmpty = !noteId || !activeNode || activeNode.node_type !== "memo";
  const showLoading = loading && nodes.length === 0;

  return (
    <div className="ds-notes-content">
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
  );
}
