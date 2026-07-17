# app/src/features/agent-chat/
> L2 | 父级: ../../CLAUDE.md

成员清单
tools/memo-write-tools.ts: 写入镜像工具（create_memo / update_memo）+ ConfirmationStore（promise-based 用户确认）+ isWriteTool 前缀判断
components/tools/ToolConfirmCard.tsx: 写入确认卡片（自订阅 ConfirmationStore，确认/取消操作）

## 边界
- 写入工具 execute 在浏览器侧执行，必须经 ConfirmationStore 等用户确认
- create_/update_ 前缀约定：onToolCall 按前缀做第二道写权拦截
- 不记录 Authorization / token 到任何日志
- schema 与 chat/src/mastra/tools/schemas.ts 手工镜像，改动须双向同步

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
