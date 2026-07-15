# api/src/common/
> L2 | 父级: ../../CLAUDE.md

成员清单
auth-context.ts: AuthContext / AuthVariables（JWT 校验后的 userId）
response.ts: ok / fail / okBody / failBody — 基于 model 信封的 helper（Hono c.json）
http.ts: 兼容 re-export → response
app-error.ts: AppError 结构化业务错误

## 边界
- 禁止在 route/service 手写临时 { code, message, data }
- 路由使用 return ok(c, data) / return fail(c, code, message)

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
