# SuperNote - AI Native 全栈 SaaS 工程骨架
Bun + TypeScript + Vite + React + React Router + Tailwind CSS v4 + Hono + Mastra + zod + Supabase client

<directory>
app/ - 用户端，承载浏览器交互界面与前端路由
chat/ - AI 能力服务，承载 Mastra Agent、Workflow、Tool 与对话接口
api/ - 业务接口服务，承载业务 HTTP API、数据访问与 Supabase 集成
</directory>

<config>
.git/ - Git 版本库元数据
app/package.json - 用户端依赖清单与 Bun 包元数据
app/bun.lock - 用户端 Bun 依赖锁定文件
app/tsconfig.json - 用户端 TypeScript 编辑器配置
app/.gitignore - 用户端 Git 忽略规则
chat/package.json - AI 能力服务依赖清单与 Bun 包元数据
chat/bun.lock - AI 能力服务 Bun 依赖锁定文件
chat/tsconfig.json - AI 能力服务 TypeScript 编辑器配置
chat/.gitignore - AI 能力服务 Git 忽略规则
api/package.json - 业务接口服务依赖清单与 Bun 包元数据
api/bun.lock - 业务接口服务 Bun 依赖锁定文件
api/tsconfig.json - 业务接口服务 TypeScript 编辑器配置
api/.gitignore - 业务接口服务 Git 忽略规则
</config>

法则: 极简·稳定·导航·版本精确
