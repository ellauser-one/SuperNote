# chat/
> L1 | 父级: ../CLAUDE.md

模块定位: AI 能力服务 · Bun + Mastra + TypeScript + @mastra/ai-sdk + @mastra/memory + @mastra/pg + zod

鉴权边界: 浏览器 JWT → `Authorization: Bearer <token>`；经 Supabase Auth 换可信 `userId` 写入 requestContext。身份只信 JWT，绝不从 body 读 userId。

本轮范围: AI 聊天 Agent + SSE `/v1/chat`（带消息落库 + Mastra Memory）；会话 CRUD `/v1/sessions`；消息分页 `/v1/sessions/:id/messages`；第一批只读客户端工具（search_memos / read_current_memo）；Memory（lastMessages:20 + workingMemory:resource scope + TokenLimiter 60万）。

<directory>
src/mastra/ - Mastra 装配与 Agent / prompts / memory
src/routes/ - 自定义 API 路由（registerApiRoute）
src/middleware/ - JWT 鉴权中间件
src/config/ - 环境变量与模型白名单
src/lib/ - Supabase REST 封装（service_role，数据访问唯一入口）
src/repository/ - 会话 + 消息数据访问层
scripts/ - init-mastra-storage.mjs（建 mastra schema 表/索引）
</directory>

## 本地开发
| 项 | 值 |
| --- | --- |
| 端口 | `PORT`（建议 20002） |
| 启动 | `cd chat && bun run dev`（mastra dev） |
| 类型检查 | `bun run typecheck` |
| SSE 端点 | `POST /v1/chat` |
| 会话端点 | `GET/POST /v1/sessions`、`PATCH/DELETE /v1/sessions/:id` |
| 消息端点 | `GET /v1/sessions/:id/messages` |
| 记忆初始化 | `DATABASE_URL=... node scripts/init-mastra-storage.mjs` |

## Memory 映射
| 域 | 字段 | 值 | 用途 |
| --- | --- | --- | --- |
| resource | userId | 用户级 | 跨会话工作记忆（偏好/称呼/语言） |
| thread | sessionId | 会话级 | 会话内消息历史（lastMessages:20 去重） |

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
