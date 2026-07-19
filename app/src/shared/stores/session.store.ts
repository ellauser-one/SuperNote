/**
 * [INPUT]: 依赖 zustand create + persist middleware、session.api（CRUD + 消息分页）
 * [OUTPUT]: 对外提供 useSessionStore（currentSessionId / sessions / CRUD actions）
 * [POS]: shared/stores 会话全局状态；AgentPanel 读此 store 驱动 key-remount 切换
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 持久化：
 * - 仅 persist currentSessionId（localStorage），刷新后停在原会话
 * - sessions 列表不持久化，每次初始化从 API 拉取
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import {
  listSessions,
  createSession,
  updateSession,
  deleteSession,
  type ChatSession,
} from "../services/chat/session.api";

/* -------------------------------------------------------------------------- */
/* 类型                                                                        */
/* -------------------------------------------------------------------------- */

export type SessionState = {
  /** 当前选中会话 id（持久化） */
  currentSessionId: string | null;
  /** 会话列表（运行时，不持久化） */
  sessions: ChatSession[];
  /** 列表加载态 */
  sessionsLoading: boolean;

  /** 初始化：拉列表，校验 currentSessionId 是否仍在列表中 */
  initSessions(): Promise<void>;
  /** 新建会话并切过去 */
  createAndSwitch(title?: string): Promise<void>;
  /** 切换当前会话 */
  switchSession(id: string): void;
  /** 乐观改名 */
  renameSession(id: string, title: string): Promise<void>;
  /** 乐观删除；删的是当前会话则回退到列表第一个或新建 */
  removeSession(id: string): Promise<void>;
  /** 刷新列表 */
  refreshSessions(): Promise<void>;
};

/* -------------------------------------------------------------------------- */
/* Store                                                                      */
/* -------------------------------------------------------------------------- */

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      currentSessionId: null,
      sessions: [],
      sessionsLoading: false,

      /* ---- 初始化 ---- */
      async initSessions() {
        set({ sessionsLoading: true });
        try {
          const list = await listSessions();
          const current = get().currentSessionId;
          // 若 currentSessionId 不在列表中，切到第一个
          const stillExists = current && list.some((s) => s.id === current);
          set({
            sessions: list,
            currentSessionId: stillExists ? current : (list[0]?.id ?? null),
            sessionsLoading: false,
          });
        } catch (err) {
          console.error("[session-store] initSessions failed:", err);
          set({ sessionsLoading: false });
        }
      },

      /* ---- 新建 ---- */
      async createAndSwitch(title?: string) {
        try {
          const session = await createSession(title);
          set((s) => ({
            sessions: [session, ...s.sessions],
            currentSessionId: session.id,
          }));
        } catch (err) {
          console.error("[session-store] createAndSwitch failed:", err);
        }
      },

      /* ---- 切换 ---- */
      switchSession(id: string) {
        set({ currentSessionId: id });
      },

      /* ---- 乐观改名 ---- */
      async renameSession(id: string, title: string) {
        // 乐观更新
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === id ? { ...sess, title, title_source: "user" as const } : sess,
          ),
        }));
        try {
          await updateSession(id, { title });
        } catch (err) {
          console.error("[session-store] renameSession failed:", err);
          // 回滚：重新拉列表
          await get().refreshSessions();
        }
      },

      /* ---- 乐观删除 ---- */
      async removeSession(id: string) {
        const { sessions, currentSessionId } = get();
        // 乐观移除
        const next = sessions.filter((s) => s.id !== id);
        let nextCurrent = currentSessionId;
        if (currentSessionId === id) {
          // 回退到列表第一个，若空则新建
          if (next.length > 0) {
            nextCurrent = next[0]!.id;
          } else {
            nextCurrent = null;
          }
        }
        set({ sessions: next, currentSessionId: nextCurrent });

        try {
          await deleteSession(id);
        } catch (err) {
          console.error("[session-store] removeSession failed:", err);
          // 回滚
          await get().refreshSessions();
        }

        // 删完列表空了，自动新建一个
        if (next.length === 0) {
          await get().createAndSwitch();
        }
      },

      /* ---- 刷新 ---- */
      async refreshSessions() {
        try {
          const list = await listSessions();
          set({ sessions: list });
        } catch (err) {
          console.error("[session-store] refreshSessions failed:", err);
        }
      },
    }),
    {
      name: "supernote-session",
      storage: createJSONStorage(() => localStorage),
      // 只持久化 currentSessionId
      partialize: (state) => ({
        currentSessionId: state.currentSessionId,
      }),
    },
  ),
);
