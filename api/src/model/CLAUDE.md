# api/src/model/
> L2 | 父级: ../../CLAUDE.md

成员清单
response.model.ts: ApiSuccessResponse / ApiErrorResponse / ApiResponse / ApiCode — 响应信封唯一真相源
api-response.model.ts: 兼容 re-export → response.model
user.model.ts: User / ProfileRow / Insert·Update 与 profiles 映射

## 边界
- 领域对象 camelCase；DB 行 snake_case
- 不 import Hono / zod
- 响应信封类型只在 response.model 定义；成功 code=0

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
