/**
 * [INPUT]: 依赖 session.store（currentSessionId / initSessions）、
 *         agent-panel.store（closePanel）、shared/ui Button、
 *         SessionList（会话列表侧栏）、ChatPanelInner（对话内核 key-remount）
 * [OUTPUT]: 对外提供 AgentPanel（右侧备忘录助手面板：会话列表 + 对话区）
 * [POS]: widgets 右侧 Agent 面板；AppShell 按 open 状态挂载
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 切换原理：
 * - ChatPanelInner 以 key=currentSessionId 挂载
 * - 换会话 → key 变 → remount → useChat 用新 initialMessages 干净重起
 * - 不手动 setMessages 清旧消息，避免残留流状态
 *
 * 刷新恢复：
 * - currentSessionId 经 zustand persist 存 localStorage
 * - 刷新后 initSessions 校验 id 是否仍在列表中，有效则恢复
 */
import { Bot, PanelRightClose } from "lucide-react";
import { useEffect } from "react";

import { useAuth } from "../../app/providers/AuthProvider";
import { useAgentPanelStore } from "../../shared/stores/agent-panel.store";
import { useSessionStore } from "../../shared/stores/session.store";
import { Button } from "../../shared/ui";
import { ChatPanelInner } from "./ChatPanelInner";
import { SessionList } from "./SessionList";

export function AgentPanel() {
  const closePanel = useAgentPanelStore((s) => s.closePanel);
  const currentSessionId = useSessionStore((s) => s.currentSessionId);
  const initSessions = useSessionStore((s) => s.initSessions);
  const { isAuthenticated } = useAuth();

  // 登录态变化时初始化会话列表
  useEffect(() => {
    if (isAuthenticated) {
      void initSessions();
    }
  }, [isAuthenticated, initSessions]);

  return (
    <aside className="flex h-full min-h-0 w-full min-w-0 overflow-hidden border-l border-vellum bg-bone">
      {/* 会话列表侧栏 */}
      <div className="flex shrink-0 flex-col border-r border-vellum" style={{ width: "var(--layout-session-list)" }}>
        <div className="shrink-0 border-b border-vellum px-4 py-4">
          <p className="font-helvetica-now text-label font-medium uppercase text-graphite">
            会话
          </p>
        </div>
        <SessionList />
      </div>

      {/* 对话区 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="shrink-0 border-b border-vellum px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="flex items-center gap-4 truncate font-davinci text-title font-medium text-ink">
                <Bot className="size-icon-sm shrink-0" aria-hidden="true" />
                <span className="truncate">备忘录助手</span>
              </h2>
            </div>

            <Button
              variant="ghost"
              size="sm"
              aria-label="关闭助手面板"
              icon={<PanelRightClose aria-hidden="true" />}
              onClick={closePanel}
            >
              关闭
            </Button>
          </div>
        </div>

        {/* Chat — key 驱动 remount */}
        <ChatPanelInner
          key={currentSessionId ?? "__empty__"}
          sessionId={currentSessionId}
        />
      </div>
    </aside>
  );
}
