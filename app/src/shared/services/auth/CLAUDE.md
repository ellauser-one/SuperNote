# app/src/shared/services/auth/
> L3 | 父级: ../CLAUDE.md

成员清单
auth.service.ts: Supabase Auth 领域操作（signIn/signUp/signOut、profiles upsert/load、getAccessToken、校验与错误映射）

## 边界
- 仅使用浏览器 anon client；禁止 service_role
- 登录：`signInWithPassword({ email, password })`；session/access_token 由 Supabase client 持久化
- `getAccessToken()` 供 api 客户端写 `Authorization: Bearer <jwt>`
- 注册：username 写入 `user_metadata`，并 upsert `profiles`
- Confirm email 关闭时，注册成功即有 session

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
