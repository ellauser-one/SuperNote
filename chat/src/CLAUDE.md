# chat/src/
> L2 | 父级: ../CLAUDE.md

成员清单
.gitkeep: 保留 AI 能力服务源码根目录，等待服务模块落位
routes/: Hono 路由层，负责 AI 服务 HTTP 入口编排
dto/: DTO 层，负责请求与响应契约描述
models/: 模型层，负责 AI 服务内部领域对象与类型边界
services/: 服务层，负责 AI 能力用例编排
mastra/: Mastra 集成层，负责 AI 能力组织
middleware/: 中间件层，负责请求上下文、鉴权、错误与横切逻辑边界
config/: 配置层，负责环境变量、运行时配置与服务参数归口
common/: 公共层，负责 AI 服务内共享常量、工具与基础类型

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
