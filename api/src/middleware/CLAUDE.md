# api/src/middleware/
> L2 | 父级: ../../CLAUDE.md

成员清单
auth.ts: requireAuth + verifyAccessToken；`Authorization: Bearer <jwt>` → AuthContext.userId

## 边界
- 用 Supabase Auth REST `GET /auth/v1/user` 验签，禁止只 decode 不校验
- 注入 `c.get('auth')`：`{ userId, email, accessToken }`
- 用户身份只来自 JWT，禁止信任 body.user_id
- chat 不走本中间件；api → chat 用 INTERNAL_SERVICE_TOKEN

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
