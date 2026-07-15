# api/
> L1 | 父级: ../CLAUDE.md

模块定位: 业务接口服务 · Bun + Hono + TypeScript + zod + Supabase REST（fetch PostgREST）

鉴权链路: 浏览器 `Authorization: Bearer <access_token>` → `requireAuth` 验 JWT（Auth REST）→ `userId` → 业务；转发 chat 时改发 `X-Service-Token` + `X-User-Id`。

数据访问: `lib/supabase-rest.ts` 用 service_role 调 `${SUPABASE_URL}/rest/v1/*`；**禁止** pg / Prisma / Drizzle / 连接串；**禁止** `@supabase/supabase-js` CRUD。service_role 绕过 RLS，service 层必须做归属校验；身份只信 JWT，不信 body.user_id。

<directory>
src/index.ts - 进程入口（ASCII 启动横幅 → Bun.serve → ready；CORS + router + 错误信封）
src/router/ - 路由聚合层，负责业务接口路由注册与模块挂载
src/api/ - HTTP 接口层，负责业务端点归属与控制器边界
src/dto/ - DTO 层，负责业务请求与响应契约描述（zod）
src/model/ - 模型层，response.model 信封 + 领域对象
src/service/ - 服务层，负责业务用例编排与权限判断
src/repository/ - 仓储层，负责 Supabase REST CRUD
src/middleware/ - 中间件层，负责鉴权与请求上下文
src/common/ - 公共层，AuthContext、ok/fail（response.ts）、AppError
src/config/ - 配置层，环境变量归口
src/lib/ - 集成库层，supabase-rest + chat-client + banner/ansi
</directory>


[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
