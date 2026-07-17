# chat/
> L1 | 父级: ../CLAUDE.md

模块定位: AI 能力服务 · Bun + Mastra + TypeScript + @mastra/ai-sdk + zod

鉴权边界: 浏览器 JWT → `Authorization: Bearer <token>`；经 Supabase Auth 换可信 `userId` 写入 requestContext。身份只信 JWT，绝不从 body 读 userId。

本轮范围: 纯聊天 Agent + SSE `/v1/chat`；无 tools、无 memory。

<directory>
src/mastra/ - Mastra 装配与 Agent / prompts
src/routes/ - 自定义 API 路由（registerApiRoute）
src/middleware/ - JWT 鉴权中间件
src/config/ - 环境变量与模型白名单
</directory>

## 本地开发
| 项 | 值 |
| --- | --- |
| 端口 | `PORT`（建议 20002） |
| 启动 | `cd chat && bun run dev`（mastra dev） |
| 类型检查 | `bun run typecheck` |
| SSE 端点 | `POST /v1/chat` |

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
