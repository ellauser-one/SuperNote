# chat/src/middleware/
> L2 | 父级: ../../CLAUDE.md

成员清单
auth.ts: authMiddleware — Authorization Bearer JWT → Supabase userId → requestContext

## 边界
- 身份只信 JWT，绝不从 body 读 userId
- 无 token / 无效 token → 401
- 日志只记 status，不打印 token

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
