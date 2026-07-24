# scripts/sql/
> L2 | 父级: ../CLAUDE.md

模块定位: 数据库迁移 round 文件 · GEB round 留底，由 Supabase MCP 执行

<directory>
round01_chat.sql - chat_sessions / chat_messages 建表 + updated_at 触发器 + RLS + grants
round02_feedback.sql - public.feedback 建表 + memos.category 列 + RLS + grants（发布冻结最小反馈闭环）
</directory>

## 约定
- 文件名以 GEB round 编号开头（round01 / round02 ...）。
- 头部注释含 `scope / tables / security / index`。
- **执行方式**：Supabase MCP（SQL 编辑器 / migrate）或 Supabase CLI；本仓不自动执行。
- **幂等**：用 `create table if not exists` / `add column if not exists` / `create policy if not exists`，可重复执行。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
