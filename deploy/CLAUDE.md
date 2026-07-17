# deploy/
> L2 | 父级: ../CLAUDE.md

模块定位: 部署与运行时镜像定义（与业务代码分离）

成员清单
docker/: 容器镜像 Dockerfile 与相关构建说明

## 边界
- 本地开发编排在仓库根 `docker-compose.dev.yml`
- 生产部署形态在此目录演进；当前仅 dev 镜像

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
