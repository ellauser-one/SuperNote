# chat/src/
> L2 | 父级: ../CLAUDE.md

成员清单
index.ts: Bun.serve 入口
routes/: /health、/v1/generate
dto/: DTO 层，负责请求与响应契约描述
models/: 模型层，负责 AI 服务内部领域对象与类型边界
services/: generate.service（AI 生成；可换 Mastra）
mastra/: Mastra 集成层，负责 AI 能力组织
middleware/: requireTrustedUser（X-Service-Token + X-User-Id）
config/: env（PORT、INTERNAL_SERVICE_TOKEN）
common/: TrustedUserContext

## 鉴权边界
- 不校验浏览器用户 JWT
- 只接受 api 转发：`X-Service-Token` + `X-User-Id`（可选 `X-User-Email`）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
