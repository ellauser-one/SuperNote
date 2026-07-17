# api/src/common/
> L3 | 父级: ../../CLAUDE.md

成员清单
app-error.ts: HttpError 结构化错误（httpStatus, code, message）
response.ts: ok / fail / okBody / failBody — 基于 model 信封的 helper（Hono c.json）

## 边界
- 禁止在 router/service 手写临时 { code, message, data }
- 路由使用 return ok(c, data) / return fail(c, code, message, status)
- 成功 code = "ok"（字符串字面量）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
