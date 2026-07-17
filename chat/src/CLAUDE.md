# chat/src/
> L2 | 父级: ../CLAUDE.md

成员清单
mastra/: Mastra 实例、memo-agent、prompts
routes/: POST /v1/chat（SSE）
middleware/: authMiddleware（Bearer JWT → Supabase userId）
config/: env（zod fail-fast）、models（白名单 + toMastraModelConfig）

## 鉴权边界
- 校验浏览器用户 JWT（Supabase Auth `/auth/v1/user`）
- 成功后 `requestContext.set('userId', userId)`
- 无 token / 无效 token → 401

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
