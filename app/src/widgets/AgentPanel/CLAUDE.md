# app/src/widgets/AgentPanel/
> L2 | 父级: ../CLAUDE.md

成员清单
index.ts: 公共导出 AgentPanel
AgentPanel.tsx: 右侧备忘录助手面板；useChat + DefaultChatTransport；空态/错误/停止/流式
MarkdownMessage.tsx: 助手消息 Markdown 渲染（react-markdown + .ds-md）
message-text.ts: UIMessage.parts → 纯文本

## 约束
- 消息状态由 useChat 持有，不进 zustand
- 开/关只读 agent-panel.store
- UI 原子只来自 shared/ui

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
