/**
 * [INPUT]: 依赖 react、widgets/MdxMemoEditor、shared/stores/memo-tree.store、
 *         shared/lib/save-with-retry、shared/types/memo
 * [OUTPUT]: 对外提供 MemoEditorView（标题 + 无感知自动保存正文）
 * [POS]: widgets 备忘录主编辑区；pages/NotesLayout 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 自动保存策略（Apple Notes 风格）：
 * - 输入立即更新本地 UI + store
 * - 后台 debounce / 字符阈值 / 最大等待
 * - blur / 切 memo / visibility hidden / pagehide 时 flush
 * - 慢响应不得覆盖更新的本地内容（store 侧竞态保护）
 * - 失败 toast；成功静默
 * - 「AI 自动分类」按钮：POST /agent/memos/classify，带 Bearer token，
 *   成功后 toast 分类结果并刷新树；401 走回登录
 */
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Loader2, Sparkles } from "lucide-react";

import { saveWithRetry } from "../shared/lib/save-with-retry";
import { useMemoTreeStore } from "../shared/stores/memo-tree.store";
import { ApiClientError, apiJson } from "../shared/services/api/client";
import { handleUnauthorized } from "../shared/services/unauthorized";
import { Button, showToast } from "../shared/ui";
import type { MemoTreeNode } from "../shared/types/memo";

/** /agent/memos/classify 的返回（后端信封 data 字段） */
type ClassifyResult = {
  category?: string;
  suggestion?: string;
  message?: string;
};

function classifySummary(data: ClassifyResult): string {
  if (data.category) {
    return `已分类：${data.category}${data.suggestion ? `（${data.suggestion}）` : ""}`;
  }
  if (data.message) return data.message;
  if (data.suggestion) return `建议分类：${data.suggestion}`;
  return "自动分类完成";
}

const MdxMemoEditor = lazy(() =>
  import("./MdxMemoEditor").then((m) => ({ default: m.MdxMemoEditor })),
);

const AUTOSAVE_CHAR_THRESHOLD = 32;
const AUTOSAVE_IDLE_MS = 1500;
const AUTOSAVE_MAX_WAIT_MS = 8000;
const AUTOSAVE_RETRY_COUNT = 3;

type MemoEditorViewProps = {
  node: MemoTreeNode;
};

export function MemoEditorView({ node }: MemoEditorViewProps) {
  const updateLocal = useMemoTreeStore((s) => s.updateMemoContentLocal);
  const saveContent = useMemoTreeStore((s) => s.saveMemoContent);
  const renameNode = useMemoTreeStore((s) => s.renameNode);
  const fetchTree = useMemoTreeStore((s) => s.fetchTree);

  const storeContent = node.memo?.content_mdx ?? "";

  /** 本地草稿所属的 memo id；与 node.id 不一致时说明刚切换、effect 尚未跑完 */
  const [boundNodeId, setBoundNodeId] = useState(node.id);
  const [value, setValue] = useState(storeContent);
  const [titleDraft, setTitleDraft] = useState(node.title);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [savingTitle, setSavingTitle] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** 保存状态指示器：编辑中 / 保存中 / 已保存 / 空闲 */
  const [saveStatus, setSaveStatus] = useState<"idle" | "editing" | "saving" | "saved">("idle");

  /**
   * 切换瞬间：MDXEditor 会因 key=node.id remount，此时 value state 仍是旧 memo。
   * 在 effect 重置前用 store 中新 memo 内容作为 markdown，避免闪旧文。
   */
  const editorMarkdown = boundNodeId === node.id ? value : storeContent;

  const titleCommitLock = useRef(false);

  const debounceTimerRef = useRef<number | null>(null);
  const maxWaitTimerRef = useRef<number | null>(null);
  const charsSinceFlushRef = useRef(0);
  const latestValueRef = useRef(storeContent);
  const lastSavedValueRef = useRef(storeContent);
  const savingContentRef = useRef<string | null>(null);

  /** 始终指向「当前打开」的 memo id；仅在 effect 内更新，避免 cleanup 读到新 id */
  const activeNodeIdRef = useRef(node.id);
  const saveContentRef = useRef(saveContent);
  saveContentRef.current = saveContent;

  const clearAutosaveTimers = useCallback(() => {
    if (debounceTimerRef.current != null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (maxWaitTimerRef.current != null) {
      window.clearTimeout(maxWaitTimerRef.current);
      maxWaitTimerRef.current = null;
    }
  }, []);

  const flushAutosave = useCallback(
    async (targetNodeId?: string) => {
      const nodeId = targetNodeId ?? activeNodeIdRef.current;
      const nextContent = latestValueRef.current;

      if (
        nextContent === lastSavedValueRef.current ||
        savingContentRef.current === nextContent
      ) {
        return;
      }

      clearAutosaveTimers();
      savingContentRef.current = nextContent;
      setSaveError(null);
      setSaveStatus("saving");

      try {
        await saveWithRetry(
          () => saveContentRef.current(nodeId, nextContent),
          { retryCount: AUTOSAVE_RETRY_COUNT },
        );

        // 仅当保存期间用户未继续改这份内容时，标记已落盘
        if (latestValueRef.current === nextContent) {
          lastSavedValueRef.current = nextContent;
          charsSinceFlushRef.current = 0;
          setSaveStatus("saved");
          window.setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
        }
      } catch {
        if (latestValueRef.current === nextContent) {
          setSaveError(
            "自动保存失败。当前内容保留在本地，稍后编辑会继续尝试保存。",
          );
        }
      } finally {
        if (savingContentRef.current === nextContent) {
          savingContentRef.current = null;
        }
      }
    },
    [clearAutosaveTimers],
  );

  const flushAutosaveRef = useRef(flushAutosave);
  flushAutosaveRef.current = flushAutosave;

  const scheduleAutosave = useCallback(() => {
    if (charsSinceFlushRef.current >= AUTOSAVE_CHAR_THRESHOLD) {
      void flushAutosave();
      return;
    }

    if (debounceTimerRef.current != null) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      void flushAutosave();
    }, AUTOSAVE_IDLE_MS);

    if (maxWaitTimerRef.current == null) {
      maxWaitTimerRef.current = window.setTimeout(() => {
        maxWaitTimerRef.current = null;
        void flushAutosave();
      }, AUTOSAVE_MAX_WAIT_MS);
    }
  }, [flushAutosave]);

  /* ── 切换 memo：重置编辑状态；cleanup 对旧 memo flush ───────── */
  useEffect(() => {
    const content = node.memo?.content_mdx ?? "";
    const noteId = node.id;

    activeNodeIdRef.current = noteId;
    setBoundNodeId(noteId);
    setValue(content);
    latestValueRef.current = content;
    lastSavedValueRef.current = content;
    savingContentRef.current = null;
    charsSinceFlushRef.current = 0;
    clearAutosaveTimers();
    setSaveError(null);
    setSaveStatus("idle");

    return () => {
      clearAutosaveTimers();
      const pending = latestValueRef.current;
      const lastSaved = lastSavedValueRef.current;
      if (pending !== lastSaved && savingContentRef.current !== pending) {
        // fire-and-forget：切换时尽量落盘旧 memo
        void saveWithRetry(
          () => saveContentRef.current(noteId, pending),
          { retryCount: AUTOSAVE_RETRY_COUNT },
        ).catch(() => {
          /* 失败时本地 store 仍保留内容 */
        });
      }
    };
    // 仅在 id 变化时重置；content 由本地编辑驱动，避免服务端回写打断输入
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: reset only on note switch
  }, [node.id, clearAutosaveTimers]);

  /* ── 页面隐藏 / 卸载前尽量 flush ───────────────────────────── */
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        void flushAutosaveRef.current();
      }
    };
    const onPageHide = () => {
      void flushAutosaveRef.current();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  /* ── 失败 toast 自动消失 ───────────────────────────────────── */
  useEffect(() => {
    if (!saveError) return;
    const t = window.setTimeout(() => setSaveError(null), 5000);
    return () => window.clearTimeout(t);
  }, [saveError]);

  const handleValueChange = useCallback(
    (nextValue: string, initialMarkdownNormalize: boolean) => {
      if (node.node_type !== "memo") return;
      // 切换瞬间 bound 尚未对齐：忽略，避免新编辑器 normalize 覆盖待 flush 的旧草稿
      if (boundNodeId !== node.id) return;

      // 初始 normalize：同步本地视图；若与磁盘不同则静默调度保存
      if (initialMarkdownNormalize) {
        latestValueRef.current = nextValue;
        setValue(nextValue);
        updateLocal(node.id, nextValue);
        if (nextValue !== lastSavedValueRef.current) {
          scheduleAutosave();
        }
        return;
      }

      const prev = latestValueRef.current;
      const delta = Math.abs(nextValue.length - prev.length);
      charsSinceFlushRef.current += delta || 1;
      latestValueRef.current = nextValue;
      setValue(nextValue);
      updateLocal(node.id, nextValue);
      setSaveStatus("editing");
      scheduleAutosave();
    },
    [boundNodeId, node.id, node.node_type, scheduleAutosave, updateLocal],
  );

  const handleEditorBlur = useCallback(() => {
    void flushAutosave();
  }, [flushAutosave]);

  /* ── 标题 ─────────────────────────────────────────────────── */

  useEffect(() => {
    setTitleDraft(node.title);
    setTitleError(null);
    titleCommitLock.current = false;
  }, [node.id, node.title]);

  const commitTitle = useCallback(async () => {
    if (titleCommitLock.current || savingTitle) return;

    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setTitleDraft(node.title);
      setTitleError(null);
      return;
    }
    if (trimmed === node.title) {
      setTitleError(null);
      return;
    }

    titleCommitLock.current = true;
    setSavingTitle(true);
    setTitleError(null);
    try {
      await renameNode(node.id, trimmed);
    } catch (err) {
      setTitleDraft(node.title);
      setTitleError(err instanceof Error ? err.message : "重命名失败");
    } finally {
      setSavingTitle(false);
      window.setTimeout(() => {
        titleCommitLock.current = false;
      }, 0);
    }
  }, [titleDraft, node.id, node.title, renameNode, savingTitle]);

  /* ── AI 自动分类 ──────────────────────────────────────────── */
  const [classifying, setClassifying] = useState(false);

  const handleClassify = useCallback(async () => {
    if (classifying) return;
    setClassifying(true);
    try {
      const data = await apiJson<ClassifyResult>("/agent/memos/classify", {
        method: "POST",
        body: JSON.stringify({ memoId: node.id }),
      });
      showToast(classifySummary(data), "success");
      // 分类可能改了树节点（如标签），刷新树
      await fetchTree();
    } catch (err) {
      // 401 已由 apiFetch 触发回登录（页面跳转），这里仅兜底
      if (err instanceof ApiClientError && err.status === 401) {
        handleUnauthorized();
        return;
      }
      showToast(
        err instanceof Error ? err.message : "自动分类失败，请稍后重试。",
        "error",
      );
    } finally {
      setClassifying(false);
    }
  }, [classifying, node.id, fetchTree]);

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-col bg-paper">
      <header className="flex shrink-0 flex-col gap-6 border-b border-vellum px-20 py-12">
        <div className="flex items-center gap-10">
          <label className="sr-only" htmlFor={`memo-title-${node.id}`}>
            备忘录标题
          </label>
          <input
            id={`memo-title-${node.id}`}
            className="ds-memo-title-input min-w-0 flex-1"
            value={titleDraft}
            disabled={savingTitle}
            onChange={(e) => {
              setTitleDraft(e.target.value);
              if (titleError) setTitleError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.currentTarget as HTMLInputElement).blur();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setTitleDraft(node.title);
                setTitleError(null);
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
            onBlur={() => {
              void commitTitle();
            }}
            placeholder="备忘录标题"
            aria-invalid={Boolean(titleError) || undefined}
            aria-describedby={
              titleError ? `memo-title-error-${node.id}` : undefined
            }
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<Sparkles aria-hidden="true" />}
            loading={classifying}
            onClick={() => {
              void handleClassify();
            }}
          >
            AI 自动分类
          </Button>
        </div>
        {titleError ? (
          <p
            id={`memo-title-error-${node.id}`}
            className="font-helvetica-now text-meta text-graphite"
            role="alert"
          >
            {titleError}
          </p>
        ) : saveError ? null : (
          <p className="font-helvetica-now text-meta text-graphite" aria-live="polite">
            {saveStatus === "editing" && "编辑中…"}
            {saveStatus === "saving" && "保存中…"}
            {saveStatus === "saved" && "已保存"}
            {saveStatus === "idle" && "已保存 · 点击标题可修改"}
          </p>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center gap-4 font-helvetica-now text-ui text-graphite">
              <Loader2 className="size-icon-sm animate-spin" aria-hidden="true" />
              加载编辑器…
            </div>
          }
        >
          {/* key 强制切换 memo 时 remount，因 MDXEditor 的 markdown 仅挂载时读入 */}
          <MdxMemoEditor
            key={node.id}
            markdown={editorMarkdown}
            onChange={handleValueChange}
            onBlur={handleEditorBlur}
            placeholder="在这里记录想法…"
          />
        </Suspense>
      </div>

      {saveError ? (
        <div className="ds-memo-save-toast" role="alert">
          <p className="font-helvetica-now text-meta">{saveError}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSaveError(null);
              void flushAutosave();
            }}
          >
            重试
          </Button>
        </div>
      ) : null}
    </div>
  );
}
