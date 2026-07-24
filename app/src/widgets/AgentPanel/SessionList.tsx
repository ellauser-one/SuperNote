/**
 * [INPUT]: 依赖 session.store（sessions / currentSessionId / CRUD actions）、
 *         shared/ui Button/Input/Dialog、lucide-react 图标、session.api ChatSession 类型
 * [OUTPUT]: 对外提供 SessionList（会话列表侧栏：新建、切换、改名、删除）
 * [POS]: widgets/AgentPanel 左侧会话列表；AgentPanel 内嵌
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 交互：
 * - 单击列表项 → switchSession
 * - 双击标题 → 内联 Input 编辑（Enter 确认 / Escape 取消）
 * - hover 显示删除按钮 → Dialog 确认（不用浏览器 confirm）
 * - 当前会话高亮（bg-vellum）
 * - 空态引导新建
 */
import { Loader2, MessageSquarePlus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useSessionStore } from "../../shared/stores/session.store";
import { Button, Dialog, Input } from "../../shared/ui";
import type { ChatSession } from "../../shared/services/chat/session.api";

/* -------------------------------------------------------------------------- */
/* 相对时间                                                                    */
/* -------------------------------------------------------------------------- */

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 30) return `${diffDay} 天前`;
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

/* -------------------------------------------------------------------------- */
/* 列表项                                                                      */
/* -------------------------------------------------------------------------- */

type SessionItemProps = {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
};

function SessionItem({
  session,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: SessionItemProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation();
    setEditValue(session.title);
    setEditing(true);
  }

  function commitEdit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== session.title) {
      onRename(trimmed);
    }
    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
    setEditValue(session.title);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`group flex cursor-pointer items-center gap-4 rounded-md px-6 py-4 transition-colors ${
        isActive
          ? "bg-vellum text-ink"
          : "text-graphite hover:bg-vellum/50"
      }`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
    >
      <div className="min-w-0 flex-1">
        {editing ? (
          <Input
            ref={inputRef}
            className="w-full"
            value={editValue}
            aria-label="编辑会话标题"
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitEdit();
              }
              if (e.key === "Escape") cancelEdit();
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p
            className="truncate font-helvetica-now text-ui font-medium"
            onDoubleClick={handleDoubleClick}
            title={session.title}
          >
            {session.title}
          </p>
        )}
        <p className="mt-1 font-helvetica-now text-meta text-graphite/70">
          {relativeTime(session.updated_at)}
        </p>
      </div>

      {/* 删除按钮（hover 显示） */}
      <Button
        variant="ghost"
        flat
        size="sm"
        aria-label={`删除会话：${session.title}`}
        icon={<Trash2 className="size-icon-xs" aria-hidden="true" />}
        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SessionList                                                                */
/* -------------------------------------------------------------------------- */

export function SessionList() {
  const sessions = useSessionStore((s) => s.sessions);
  const currentSessionId = useSessionStore((s) => s.currentSessionId);
  const sessionsLoading = useSessionStore((s) => s.sessionsLoading);
  const switchSession = useSessionStore((s) => s.switchSession);
  const createAndSwitch = useSessionStore((s) => s.createAndSwitch);
  const renameSession = useSessionStore((s) => s.renameSession);
  const removeSession = useSessionStore((s) => s.removeSession);

  const [deleteTarget, setDeleteTarget] = useState<ChatSession | null>(null);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTarget) {
      void removeSession(deleteTarget.id);
      setDeleteTarget(null);
    }
  }, [deleteTarget, removeSession]);

  /* ---- 加载态 ---- */
  if (sessionsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-4 p-8">
        <Loader2 className="size-icon-sm animate-spin" aria-hidden="true" />
        <p className="font-helvetica-now text-meta text-graphite">加载中…</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* 新建按钮 */}
      <div className="shrink-0 px-4 py-6">
        <Button
          variant="outline"
          size="sm"
          icon={<MessageSquarePlus aria-hidden="true" />}
          className="w-full justify-center"
          onClick={() => void createAndSwitch()}
        >
          新建会话
        </Button>
      </div>

      {/* 列表 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        {sessions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="font-helvetica-now text-meta text-graphite">
              还没有会话
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === currentSessionId}
                onSelect={() => switchSession(session.id)}
                onRename={(title) => void renameSession(session.id, title)}
                onDelete={() => setDeleteTarget(session)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 删除确认 Dialog */}
      <Dialog.Root
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <Dialog.Content>
          <Dialog.Title>确认删除</Dialog.Title>
          <Dialog.Description className="mt-4 font-helvetica-now text-ui text-graphite">
            删除后无法恢复，确定要删除「{deleteTarget?.title}」吗？
          </Dialog.Description>
          <div className="mt-8 flex justify-end gap-4">
            <Dialog.Close asChild>
              <Button variant="outline" size="sm">取消</Button>
            </Dialog.Close>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDeleteConfirm}
            >
              删除
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}
