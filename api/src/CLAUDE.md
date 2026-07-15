# api/src/
> L2 | 父级: ../CLAUDE.md

成员清单
index.ts: Bun.serve 入口（banner → runtime → serve → ready；CORS + router + 错误信封）
router/: 路由聚合 — /health、/v1/me、/v1/profiles、/v1/ai
api/: HTTP 接口 — me、profiles、ai/generate
dto/: profile / ai 请求契约
model/: response.model 信封 + user/profile 领域类型
service/: me / profile / ai 业务编排与归属校验
repository/: profile.repository（PostgREST REST only）
middleware/: requireAuth（Bearer JWT → userId）
common/: AuthContext、ok/fail、AppError
config/: env（APP_NAME、SUPABASE_*、CHAT、INTERNAL_SERVICE_TOKEN）
lib/: supabase-rest + chat-client + ansi + banner

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
