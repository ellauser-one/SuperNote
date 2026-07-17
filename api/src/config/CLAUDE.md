# api/src/config/
> L3 | 父级: ../../CLAUDE.md

成员清单
env.ts: zod 校验环境变量只读视图（PORT / NODE_ENV / SYSTEM_NAME / CORS_ORIGINS / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）

## 边界
- 环境变量只在此归口读取；业务代码不直接散落 process.env
- service_role 仅服务端；禁止写入前端可访问产物

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
