# chat/src/lib/
> L2 | 父级: ../CLAUDE.md

成员清单
supabase-rest.ts: chat/ 数据访问唯一入口（service_role fetch + PostgrestQueryBuilder）

## 铁律
- 禁 ORM / pg 连接串 / supabase-js
- service_role key 只在本目录，绝不暴露给前端
- 日志只记 method/path/status，不打印 content 正文

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
