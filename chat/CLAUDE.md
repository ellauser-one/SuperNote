# chat/
> L1 | 父级: ../CLAUDE.md

模块定位: AI 能力服务 · Bun + Hono + TypeScript + Mastra + zod

鉴权边界: 不直收浏览器 JWT；只接受 api 转发的可信 user context（`X-Service-Token` + `X-User-Id`）。

<directory>
src/index.ts - 进程入口
src/routes/ - Hono 路由层，负责 AI 服务 HTTP 入口编排
src/dto/ - DTO 层，负责请求与响应契约描述
src/models/ - 模型层，负责 AI 服务内部领域对象与类型边界
src/services/ - 服务层，负责 AI 能力用例编排
src/mastra/ - Mastra 集成层，负责 agents、workflows、tools、prompts 的 AI 能力组织
src/middleware/ - 中间件层，负责请求上下文、鉴权、错误与横切逻辑边界
src/config/ - 配置层，负责环境变量、运行时配置与服务参数归口
src/common/ - 公共层，负责 AI 服务内共享常量、工具与基础类型
</directory>

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
