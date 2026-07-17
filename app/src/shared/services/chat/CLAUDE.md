# app/src/shared/services/chat/
> L2 | 父级: ../CLAUDE.md

成员清单
chat-transport.ts: DefaultChatTransport + chatFetch（Supabase session → Bearer）；ChatClientError envelope 解析

## 边界
- 只取登录态 token，不直连 Supabase 业务表
- api 指向 chat 服务 `/v1/chat`（`VITE_CHAT_BASE_URL`）
- 非 2xx → 抛 `ChatClientError`（含 `code`）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
