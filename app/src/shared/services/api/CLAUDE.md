# app/src/shared/services/api/
> L4 | 父级: ../CLAUDE.md

成员清单
client.ts: apiFetch / apiJson / fetchMe / generateAi；自动附带 Authorization Bearer
memo.api.ts: 备忘录业务端点（getMemoTree/createMemoFolder/createMemo/updateMemo/updateMemoNode/moveMemoNode）；解包 ApiEnvelope 信封

## 边界
- 只打业务 api（VITE_API_URL），禁止浏览器直连 chat
- token 来自 auth.getAccessToken()（Supabase session.access_token）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
