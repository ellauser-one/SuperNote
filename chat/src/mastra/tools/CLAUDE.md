# chat/src/mastra/tools/
> L2 | 父级: ../CLAUDE.md

成员清单
schemas.ts: 全部工具的 input/output zod schema 唯一真相源 — CompactMemo（id/title/category/excerpt，禁完整正文）、search_memos、read_current_memo、create_memo、update_memo、writeResultOutput、isWriteTool

## 铁律
- inputSchema 顶层必须 z.object；每字段 .describe()
- 客户端工具壳（无 execute）在 routes/chat.ts 组装注入，不放本目录；本目录只放 schema 与未来的服务端工具
- 写工具统一 create_/update_ 前缀，isWriteTool() 按前缀判断
- app/src/features/agent-chat/tools/memo-write-tools.ts 是手工镜像，schema 改动须双向同步

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
