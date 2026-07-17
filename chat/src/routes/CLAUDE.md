# chat/src/routes/
> L2 | 父级: ../../CLAUDE.md

成员清单
chat.ts: registerApiRoute POST /v1/chat — authMiddleware + handleChatStream + createUIMessageStreamResponse

## 关键
- maxSteps 必须显式传 env.MAX_STEPS（默认 50），避免 AI SDK 默认 5 步腰斩

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
