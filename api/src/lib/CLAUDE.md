# api/src/lib/
> L3 | 父级: ../../CLAUDE.md

成员清单
supabase-rest.ts: supabaseRest（PostgREST fetch client）+ createPostgrestQuery 查询串构造器
supabase-auth.ts: extractBearerToken / fetchAuthUser — 校验用户 JWT（Auth REST）
ansi.ts: ANSI 色板、visibleLen、padVisible；NO_COLOR / 非 TTY 关闭颜色
banner.ts: printBanner / printRuntimeInfo / printReady / runtimeInfoFromEnv

## 边界
- repository 经 supabaseRest 访问 PostgREST，禁止 supabase-js 客户端 CRUD
- Auth 经 supabase-auth 访问 `/auth/v1/user`，user id 只来自 JWT
- 非 2xx 抛 HttpError(502, "SUPABASE_REST_ERROR", ...) 或 401 UNAUTHORIZED
- 日志不打印 token / service_role / 完整 Authorization
- 启动横幅纯 ASCII 写 stdout，无 unicode box-drawing

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
