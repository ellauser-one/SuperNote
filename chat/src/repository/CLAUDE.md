# chat/src/repository/
> L2 | 父级: ../CLAUDE.md

成员清单
chat.repository.ts: 会话 CRUD + 消息 upsert/分页查询（chat_sessions / chat_messages）

## 铁律
- 每次查询强制带 user_id（双保险，RLS 是第一道）
- upsert 用 (session_id, client_id) onConflict 幂等
- 游标分页：before = base64url(JSON({ created_at, id }))

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
