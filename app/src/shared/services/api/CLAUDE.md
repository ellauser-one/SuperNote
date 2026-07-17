# app/src/shared/services/api/
> L4 | 父级: ../CLAUDE.md

成员清单
client.ts: apiFetch / apiJson；自动附带 Authorization Bearer；解析信封 message
memo.api.ts: getMemoTree / createMemoFolder / createMemo / getMemo / updateMemo / updateMemoNode / moveMemoNode

## 边界
- 只打业务 api（VITE_API_BASE_URL），禁止浏览器直连 chat
- token 来自 auth.getAccessToken()（Supabase session.access_token）
- 路径对齐后端：/memo-tree · /memo-folders · /memos · /memo-nodes/*
- 信封 code === "ok" 才解包 data

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
