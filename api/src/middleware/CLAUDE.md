# api/src/middleware/
> L3 | 父级: ../../CLAUDE.md

成员清单
request-logger.ts: requestLogger — [request] ISO method path status duration origin
error-handler.ts: errorHandler — HttpError → fail 信封；未知错误 → 500

## 边界
- 请求日志禁止打印 token / service_role / 完整 Authorization header
- 错误处理不向响应体泄漏 stack trace

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
