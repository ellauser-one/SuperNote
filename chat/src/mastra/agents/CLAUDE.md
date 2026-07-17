# chat/src/mastra/agents/
> L2 | 父级: ../CLAUDE.md

成员清单
memo-agent.ts: memoAgent — id/name/instructions(from prompts)/model/defaultOptions.modelSettings；条件挂 memory（mastraMemory）+ inputProcessors（TokenLimiter）；客户端工具壳在 routes/chat.ts 经 params.clientTools 注入，严禁绑进本文件

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
