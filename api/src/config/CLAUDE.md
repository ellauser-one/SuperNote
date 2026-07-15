# api/src/config/
> L2 | 父级: ../../CLAUDE.md

成员清单
env.ts: 运行时环境变量只读视图（SUPABASE_URL / SERVICE_ROLE / CHAT / CORS）

## 边界
- 环境变量只在此归口读取；业务代码不直接散落 process.env
- service_role 仅服务端；禁止写入前端可访问产物

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
