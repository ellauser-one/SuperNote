# api/src/service/
> L2 | 父级: ../../CLAUDE.md

成员清单
me.service.ts: GET /v1/me 聚合
profile.service.ts: 本人 profile 读改/upsert、username 可用性与归属校验
ai.service.ts: AI generate 编排（userId 来自 JWT）

## 边界
- 不依赖 Hono Context；入参为 Actor / 纯数据
- 用户身份只来自 JWT userId，禁止信任 body.user_id

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
