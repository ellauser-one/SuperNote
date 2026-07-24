# api/
> L2 | 父级: ../CLAUDE.md

模块定位: 业务接口服务 · Bun + Hono + TypeScript + zod + Supabase REST（fetch PostgREST）

## 技术栈
- 运行时: Bun
- 框架: Hono
- 校验: zod
- 数据访问: Supabase REST / PostgREST（纯 fetch，禁止 ORM）
- 端口: 20001

## 数据访问
`lib/supabase-rest.ts` 用 service_role 调 `${SUPABASE_URL}/rest/v1/*`。
- 禁止 pg / Prisma / Drizzle / 任何 ORM / 任何数据库连接串
- 禁止 `@supabase/supabase-js` CRUD
- service_role key 只存在 api/ 环境变量中，禁止出现在代码与前端
- 用户 JWT 校验：`lib/supabase-auth.ts` → `${SUPABASE_URL}/auth/v1/user`

## Schema 契约
- `supabase/profiles.sql` — public.profiles 表 + RLS + grants 留底（MCP 执行）
- `supabase/memo_nodes.sql` — public.memo_nodes + public.memos + 树触发器 + RLS + grants

## 分层禁令
| 层 | 允许 | 禁止 |
| --- | --- | --- |
| index.ts | 启动顺序编排 | 业务逻辑、Hono 组装 |
| app.ts | 组装 Hono（日志/CORS/错误/路由） | 业务逻辑 |
| router/ | 挂路径、读请求、zod 校验、调 service、返回响应 | 业务判断 |
| dto/ | zod schema 与 infer 类型 | import Hono |
| model/ | 领域类型、响应信封类型 | import Hono、zod |
| service/ | 业务编排、权限判断 | 依赖 Hono Context |
| repository/ | Supabase REST CRUD | 写业务权限 |
| middleware/ | 请求日志、错误处理 | 业务逻辑 |
| common/ | HttpError、ok/fail helper | 业务逻辑 |
| config/ | env.ts（zod 校验环境变量） | 业务逻辑 |
| lib/ | supabase-rest.ts、supabase-auth.ts、banner.ts | 业务逻辑 |

## 统一响应信封
- 成功: `{ code: "ok", message: string, data: T }`
- 失败: `{ code: string, message: string, data: null }`
- 路由禁止散落 `c.json({ code, message, data })`，必须使用 `common/response.ts` 的 `ok(c, data)` / `fail(c, code, message, status)`

<directory>
src/index.ts - 进程入口（printBanner → printRuntimeInfo → Bun.serve → printReady）
src/app.ts - Hono 组装（请求日志 + CORS + 错误处理 + router 聚合）
src/router/ - 路由层，负责路径挂载、zod 校验、调 service、返回响应（health/profile/memo/feedback/agent 子路由）
src/dto/ - DTO 层，zod schema 与 infer 类型
src/model/ - 模型层，响应信封类型与领域类型
src/service/ - 服务层，业务编排与权限判断
src/repository/ - 仓储层，Supabase REST CRUD
src/middleware/ - 中间件层，请求日志与错误处理
src/common/ - 公共层，HttpError 与 ok/fail helper
src/config/ - 配置层，env.ts（zod 校验环境变量）
src/lib/ - 集成库层，supabase-rest.ts + supabase-auth.ts + banner.ts + ansi.ts
supabase/ - Schema SQL 留底（profiles.sql）
</directory>

## 发布冻结新增（round 02 · 最小反馈闭环 + AI 分类）
- 路由 `POST /api/feedback`：仅 Supabase REST 写入 `public.feedback`，owner_id 来自 JWT，body 拒绝 `id/user_id/owner_id`。
- 路由 `POST /agent/memos/classify`：读取 memo（owner 校验）→ 转发用户 JWT 给 `chat /v1/classify` → 落库 `memos.category`。
- CORS 区分 dev/prod：非 `production` 用 `*` 通配；`production` 严格 `CORS_ORIGINS` 白名单。
- 新增文件：`router/feedback.router.ts`、`router/agent.router.ts`、`service/feedback.service.ts`、`service/memo-classify.service.ts`、`repository/feedback.repository.ts`、`dto/feedback.dto.ts`、`dto/classify.dto.ts`。
- 迁移：`scripts/sql/round02_feedback.sql`（经 Supabase MCP 执行）。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
