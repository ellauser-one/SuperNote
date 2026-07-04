# api/src/
> L2 | 父级: ../CLAUDE.md

成员清单
.gitkeep: 保留业务接口服务源码根目录，等待服务模块落位
router/: 路由聚合层，负责业务接口路由注册与模块挂载
api/: HTTP 接口层，负责业务端点归属与控制器边界
dto/: DTO 层，负责业务请求与响应契约描述
model/: 模型层，负责业务领域对象与类型边界
service/: 服务层，负责业务用例编排
repository/: 仓储层，负责数据访问抽象与持久化边界
middleware/: 中间件层，负责鉴权、错误、日志与请求上下文边界
common/: 公共层，负责业务服务内共享常量、工具与基础类型
config/: 配置层，负责环境变量、运行时配置与服务参数归口
lib/: 集成库层，负责 Supabase client 等外部 SDK 封装边界

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
