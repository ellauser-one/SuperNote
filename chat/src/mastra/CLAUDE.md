# chat/src/mastra/
> L2 | 父级: ../../CLAUDE.md

成员清单
index.ts: new Mastra({ agents, server }) — agents['memo-agent']、cors、apiRoutes
agents/: memo-agent 定义（无 tools；客户端工具经 routes/chat.ts params.clientTools 注入；条件挂 memory + inputProcessors）
memory.ts: mastraMemory（Memory + PostgresStore，schemaName='mastra'，disableInit，降级安全）+ memoryInputProcessors（TokenLimiter 60万）
prompts/: 系统提示词资产（memoAgentPrompt，含只读工具使用规则）
tools/: 工具 schema 真相源（schemas.ts：search_memos / read_current_memo / CompactMemo）
workflows/: 预留（本轮不用）

## Memory 架构
- PostgresStore 连 DATABASE_URL，schemaName='mastra' 隔离记忆表
- disableInit: true — 请求路径绝不做 DDL，由 scripts/init-mastra-storage.mjs 显式建表
- lastMessages: 20，workingMemory scope='resource'（跨会话用户偏好）
- 严禁 ToolCallFilter，防 OOM 走 TokenLimiter（60万 token）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
