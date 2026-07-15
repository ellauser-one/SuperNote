# api/src/repository/
> L2 | 父级: ../../CLAUDE.md

成员清单
profile.repository.ts: profiles REST CRUD（findById / findByUsername / upsert / update）

## 边界
- 只做数据访问，不做鉴权编排与 HTTP 映射
- 全部走 lib/supabase-rest → `${SUPABASE_URL}/rest/v1/profiles`
- service_role 绕过 RLS；归属由 service 层保证

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
