# chat/src/routes/
> L2 | 父级: ../../CLAUDE.md

成员清单
chat.ts: registerApiRoute POST /v1/chat — authMiddleware + READ_TOOLS + WRITE_TOOLS（无 execute 壳）+ buildClientTools(canWrite) + handleChatStream(params.clientTools + params.memory) + createUIMessageStreamResponse

## 关键
- maxSteps 必须显式传 env.MAX_STEPS（默认 50），避免 AI SDK 默认 5 步腰斩
- clientTools 每请求注入；壳工具 schema 来自 mastra/tools/schemas.ts，与 app/ 镜像工具同 id
- 无 execute 工具严禁绑 Agent 构造器（会被当 server tool 回退 return inputData，agent loop 死）
- 写工具统一 create_/update_ 前缀；buildClientTools(canWrite) 按写权组装工具表
- 当前默认所有已登录用户都有写权；未来扩展角色检查时只改 buildClientTools
- memory: { resource: userId, thread: sessionId } — 用户级工作记忆 + 会话级历史

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
