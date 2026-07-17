# api/src/
> L3 | 父级: ../CLAUDE.md

成员清单
index.ts: 进程入口（printBanner → printRuntimeInfo → Bun.serve → printReady）
app.ts: Hono 组装（请求日志 + CORS + 错误处理 + router 聚合）
router/: 路由层 — /health · /profile · memo 树接口
dto/: profile.dto · memo.dto
model/: response.model · profile.model · memo.model
service/: profile.service · memo.service
repository/: profile.repository · memo.repository
middleware/: request-logger / error-handler
common/: HttpError、ok/fail helper
config/: env.ts
lib/: supabase-rest · supabase-auth · ansi · banner

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
