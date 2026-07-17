# api/src/repository/
> L3 | 父级: ../../CLAUDE.md

成员清单
profile.repository.ts: findProfileById / insertProfile / updateProfileById
memo.repository.ts: listActiveNodesByUser / findNodeByIdForUser / findMaxSortOrder / insertNode / updateNodeForUser / listMemosByUser / findMemoByNodeIdForUser / insertMemo / updateMemoForUser

## 边界
- 只做数据访问，不做鉴权编排与 HTTP 映射
- 全部走 lib/supabase-rest → `${SUPABASE_URL}/rest/v1/*`
- service_role 绕过 RLS；归属由 service 层保证
- 禁止 supabase-js 客户端 / 连接串

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
