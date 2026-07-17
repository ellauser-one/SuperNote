#!/usr/bin/env node
/**
 * [L3 契约] init-mastra-storage.mjs
 *
 * [INPUT]: 环境变量 DATABASE_URL（必须）
 * [OUTPUT]: 在 PostgreSQL 中建 mastra schema + Mastra Memory 所需表/索引
 * [POS]: scripts/；部署时或首次启动前手动执行
 * [PROTOCOL]: 请求路径绝不做 DDL；此脚本是建表唯一入口
 *
 * 用法：
 *   DATABASE_URL=postgresql://... node scripts/init-mastra-storage.mjs
 *
 * 建表清单（PostgresStore schemaName='mastra' 下）：
 *   mastra.mastra_threads       — 会话线程
 *   mastra.mastra_messages      — 消息历史
 *   mastra.mastra_resources     — 用户级工作记忆
 *   mastra.mastra_workflow_snapshot
 *   mastra.mastra_evals
 *   mastra.mastra_traces
 *   mastra.mastra_scorers
 *   mastra.mastra_notifications
 *
 * 建完后 PostgresStore 运行时只做 CRUD，不做 DDL。
 */

import { PostgresStore } from "@mastra/pg";

/* ------------------------------------------------------------------ */
/* 前置校验                                                            */
/* ------------------------------------------------------------------ */

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("[init-mastra] 错误: 缺少 DATABASE_URL 环境变量");
  console.error("  用法: DATABASE_URL=postgresql://... node scripts/init-mastra-storage.mjs");
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 建 schema + 表 + 索引                                               */
/* ------------------------------------------------------------------ */

console.log("[init-mastra] 开始初始化 Mastra 存储...");
console.log("[init-mastra] schemaName: mastra");

const store = new PostgresStore({
  id: "mastra-memory-store",
  connectionString: DATABASE_URL,
  schemaName: "mastra",
  // 此处显式建表，故 disableInit 不设（让 init() 执行 DDL）
  ssl: { rejectUnauthorized: false },
});

try {
  // init() 创建 schema + 全部 mastra_* 表 + 默认索引
  await store.init();
  console.log("[init-mastra] ✓ schema + 表 + 索引创建成功");

  // 验证表是否就绪
  const result = await store.db.any(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'mastra'
     ORDER BY table_name`,
  );

  console.log("[init-mastra] 已建表:");
  for (const row of result) {
    console.log(`  - mastra.${row.table_name}`);
  }

  console.log("[init-mastra] ✓ 初始化完成，请求路径不再做 DDL");
} catch (err) {
  console.error("[init-mastra] 初始化失败:", err);
  process.exit(1);
} finally {
  await store.close();
}
