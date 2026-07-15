# app/src/shared/services/supabase/
> L3 | 父级: ../CLAUDE.md

成员清单
client.ts: 浏览器端 `@supabase/supabase-js` 单例；仅消费 `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`（兼容 publishable）

## 约束
- 禁止在前端使用 `service_role` / secret key
- 环境变量只允许 `VITE_*` 公开值；密钥放 `app/.env.local`（已 gitignore）
- 全应用只创建一次 client（模块级单例）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
