# app/src/widgets/AgentPanel/
> L2 | 父级: ../CLAUDE.md

成员清单
index.ts: 公共导出 AgentPanel
AgentPanel.tsx: 右侧备忘录助手面板壳；左列 SessionList + 右列 ChatPanelInner（key=currentSessionId remount 干净切换）；initSessions 随登录态触发
ChatPanelInner.tsx: 单会话对话内核；useChat + DefaultChatTransport（body.sessionId）+ onToolCall 工具回灌 + sendAutomaticallyWhen；历史首页加载 + before 游标翻页；写权第二道拦截
SessionList.tsx: 会话列表侧栏；新建/切换/双击改名（内联 Input）/删除（Dialog 确认）；当前会话高亮 + 空态引导
MarkdownMessage.tsx: 助手消息 Markdown 渲染（react-markdown + .ds-md）
message-text.ts: UIMessage.parts → 纯文本

## 约束
- 消息状态由 useChat 持有，不进 zustand
- 会话 id 进 zustand + persist（localStorage），刷新恢复
- 切换会话靠 key-remount，不手动 setMessages 清旧消息
- 开/关只读 agent-panel.store
- UI 原子只来自 shared/ui
- onToolCall 返回值会被 AI SDK 丢弃，必须显式 addToolResult；未知工具/执行失败也要回 output-error，否则 agent loop 卡死
- 写权跟人走：create_/update_ 前缀工具在 onToolCall 检查 canWrite，无写权直接回灌「只读」错误
- 写入前确认：ToolConfirmCard 订阅 ConfirmationStore，用户确认/拒绝后 resolve promise

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
