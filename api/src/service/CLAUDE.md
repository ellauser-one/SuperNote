# api/src/service/
> L3 | 父级: ../../CLAUDE.md

成员清单
profile.service.ts: getOrCreateProfile / updateProfile — 归属校验、默认 nickname/username
memo.service.ts: getMemoTree / createFolder / createMemo / getMemo / updateMemo / renameNode / moveNode — 树组装、父文件夹校验、防环移动

## 边界
- 不依赖 Hono Context；入参为纯数据
- 业务编排与权限判断在此层
- service_role 绕过 RLS → 必须 assert user_id === authUser.id
- 写树前 ensure profile（FK → profiles）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
