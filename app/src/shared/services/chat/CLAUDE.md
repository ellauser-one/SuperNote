# app/src/shared/services/chat/
> L2 | 父级: ../CLAUDE.md

成员清单
chat-transport.ts: DefaultChatTransport + chatFetch（Supabase session → Bearer）；ChatClientError envelope 解析；createChatTransport 支持传入 sessionId 作为 body
client-tools.ts: 客户端镜像工具（@mastra/client-js createTool，同 chat/ 壳同 id）— search_memos / read_current_memo / create_memo / update_memo；findClientTool 供 onToolCall 查找；写工具从 features/agent-chat/tools/memo-write-tools 导入
session.api.ts: 会话 CRUD + 消息分页 REST 客户端；复用 chatFetch 解包 chat/ 信封；类型 ChatSession / ChatMessage / MessagePage

## 边界
- 只取登录态 token，不直连 Supabase 业务表
- api 指向 chat 服务 `/v1/chat`（`VITE_CHAT_BASE_URL`）
- 非 2xx → 抛 `ChatClientError`（含 `code`）
- 镜像工具只回 CompactMemo（id/title/category/excerpt），禁止把 content_mdx 喂给模型
- schema 与 chat/src/mastra/tools/schemas.ts 手工镜像，改动须双向同步
- 写工具（create_memo / update_memo）从 features/agent-chat/tools 导入，注册进 clientTools 表

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
