# api/src/dto/
> L2 | 父级: ../../CLAUDE.md

成员清单
profile.dto.ts: UpdateProfileBody / UpsertProfileBody / UsernameAvailableQuery（无 id/user_id）
ai.dto.ts: AiGenerateBody（仅 message）

## 边界
- 只放 zod schema 与 z.infer；身份字段不进 body 契约

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
