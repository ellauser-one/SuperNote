# scripts/
> L2 | 父级: ../CLAUDE.md

模块定位: 本地开发运维脚本（Docker 启停与日志）

成员清单
docker-start.sh: 解析 .env.local|.env → compose up --build api
docker-stop.sh: compose down --remove-orphans（不 prune）
docker-logs.sh: logs -f api；非 api 服务名提示 app/chat 分工

## 边界
- 只编排 Docker 中的 api；app 本机 Bun/Vite，chat 暂不启动
- 不创建数据库容器；密钥来自仓库根 env 文件
- 每条脚本顶部含 [INPUT]/[OUTPUT]/[POS]/[PROTOCOL] 契约

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
