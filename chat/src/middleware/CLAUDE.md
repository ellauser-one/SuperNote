# chat/src/middleware/
> L2 | 父级: ../../CLAUDE.md

成员清单
user-context.ts: requireTrustedUser；校验 X-Service-Token + X-User-Id（可选 X-User-Email）

## 边界
- 不直接校验浏览器用户 JWT
- 只接受 api 转发的可信 user context
- 与 api 共享 INTERNAL_SERVICE_TOKEN

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
