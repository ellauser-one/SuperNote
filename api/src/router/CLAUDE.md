# api/src/router/
> L3 | 父级: ../../CLAUDE.md

成员清单
index.ts: 根路由聚合 — health / profile / memo
health.router.ts: GET /health
profile.router.ts: GET /profile · PATCH /profile
memo.router.ts: GET /memo-tree · POST /memo-folders · POST /memos · GET|PATCH /memos/:nodeId · PATCH /memo-nodes/:nodeId · PATCH /memo-nodes/:nodeId/move

## 边界
- 只挂路径、读请求、zod 校验、调 service、返回响应
- 禁止业务判断
- user id 只来自 Authorization JWT，禁止 body 身份字段

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
