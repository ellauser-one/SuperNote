# api/src/lib/
> L2 | 父级: ../../CLAUDE.md

成员清单
supabase-rest.ts: PostgREST fetch client（service_role）+ Auth REST 验 JWT
chat-client.ts: api → chat 转发（X-Service-Token + X-User-Id 可信上下文）
ansi.ts: ANSI 色板、visibleLen、padVisible；NO_COLOR / 非 TTY 关闭颜色
banner.ts: printBanner / printRuntimeInfo / printReady 与系统名推断

## 边界
- repository 经 supabaseRest 访问 PostgREST，禁止 @supabase/supabase-js CRUD
- service_role 仅服务端；浏览器 JWT 只在 api 校验
- 日志不打印 token / service_role / 完整 Authorization
- 启动横幅纯 ASCII 写 stdout，无 unicode box-drawing

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
