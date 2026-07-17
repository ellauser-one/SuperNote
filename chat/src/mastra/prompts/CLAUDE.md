# chat/src/mastra/prompts/
> L2 | 父级: ../CLAUDE.md

成员清单
index.ts: memoAgentPrompt — 中文备忘录助手人格与铁律 + 只读/写入工具使用规则（search_memos / read_current_memo / create_memo / update_memo；写入前需用户确认；结果回来前禁编造）

铁律: Agent instructions 必须从此 import，禁止在 agent 文件 inline 字符串

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
