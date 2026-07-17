# api/src/model/
> L3 | 父级: ../../CLAUDE.md

成员清单
response.model.ts: ApiSuccessResponse / ApiErrorResponse / ApiResponse — 响应信封唯一真相源
profile.model.ts: AuthUser / Profile / ProfileUpdate
memo.model.ts: MemoNode / MemoContent / MemoTreeNode / Create* / Update* / Move*

## 边界
- 不 import Hono / zod
- 成功 code = "ok"（字符串字面量）
- 失败 code = 大写字符串（如 "UNAUTHORIZED"、"SUPABASE_REST_ERROR"）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
