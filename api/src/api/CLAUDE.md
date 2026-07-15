# api/src/api/
> L2 | 父级: ../../CLAUDE.md

成员清单
me.api.ts: GET /v1/me — JWT 用户 + profiles 摘要
profiles.api.ts: /v1/profiles/me（GET/PATCH/PUT）、username-available
ai.api.ts: POST /v1/ai/generate — JWT → 可信 user context → chat

边界: 只挂路径、读请求、调 service、返回 ok/fail；不做 REST 与归属细节。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
