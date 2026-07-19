# app/src/shared/stores/
> L2 | 父级: ../CLAUDE.md

成员清单
memo-tree.store.ts: 备忘录树全局状态（乐观更新）
agent-panel.store.ts: Agent 面板开/关薄状态（不镜像 messages）
session.store.ts: 会话全局状态（zustand + persist）；currentSessionId 持久化到 localStorage，sessions 列表运行时拉取；提供 initSessions/createAndSwitch/switchSession/renameSession/removeSession

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
