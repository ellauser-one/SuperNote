# app/src/widgets/AgentPanel/
> L2 | 父级: ../CLAUDE.md

成员清单
index.ts: 公共导出 AgentPanel
AgentPanel.tsx: 右侧备忘录助手面板；useChat + DefaultChatTransport + onToolCall（findClientTool → execute → 显式 addToolResult）+ sendAutomaticallyWhen(lastAssistantMessageIsCompleteWithToolCalls)；空态/错误/停止/流式；写权第二道拦截（isWriteTool + canWrite）+ ToolConfirmCard 确认渲染
MarkdownMessage.tsx: 助手消息 Markdown 渲染（react-markdown + .ds-md）
message-text.ts: UIMessage.parts → 纯文本

## 约束
- 消息状态由 useChat 持有，不进 zustand
- 开/关只读 agent-panel.store
- UI 原子只来自 shared/ui
- onToolCall 返回值会被 AI SDK 丢弃，必须显式 addToolResult；未知工具/执行失败也要回 output-error，否则 agent loop 卡死
- 写权跟人走：create_/update_ 前缀工具在 onToolCall 检查 canWrite，无写权直接回灌「只读」错误
- 写入前确认：ToolConfirmCard 订阅 ConfirmationStore，用户确认/拒绝后 resolve promise

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
