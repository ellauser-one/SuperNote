# chat/src/
> L2 | 父级: ../CLAUDE.md

成员清单
mastra/: Mastra 实例、memo-agent、prompts
routes/: POST /v1/chat（SSE + 消息落库）、会话 CRUD、消息分页
middleware/: authMiddleware（Bearer JWT → Supabase userId）
config/: env（zod fail-fast）、models（白名单 + toMastraModelConfig）
lib/: supabaseRest 封装（service_role 数据访问唯一入口）
repository/: 会话 + 消息数据访问层

## 鉴权边界
- 校验浏览器用户 JWT（Supabase Auth `/auth/v1/user`）
- 成功后 `requestContext.set('userId', userId)`
- 无 token / 无效 token → 401

## 数据访问边界
- 会话/消息表经 repository → lib/supabaseRest 访问
- service_role key 只在 lib/，绝不暴露给前端
- 应用层每次查询强制带 user_id（双保险）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
