# deploy/docker/
> L3 | 父级: ../CLAUDE.md

成员清单
api.Dockerfile: oven/bun:1.3.5 基础层；COPY package+lock → bun install；代码由 compose bind mount

## 边界
- build context = 仓库根目录
- 镜像只负责依赖层；`bun run dev` 开发热更靠 volume
- 端口约定：容器内 api 监听 20001

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
