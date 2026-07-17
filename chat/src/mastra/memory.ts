/**
 * [INPUT]: 依赖 @mastra/memory、@mastra/pg、config/env（DATABASE_URL）
 * [OUTPUT]: 对外提供 mastraMemory（Memory 实例）或 null（DATABASE_URL 缺失时降级）
 * [POS]: mastra 层；Agent 构造器 conditionally 挂 memory 字段
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 设计要点：
 * - PostgresStore 连 DATABASE_URL，schemaName='mastra' 隔离记忆表
 * - disableInit: true — 请求路径绝不做 DDL，由 scripts/init-mastra-storage.mjs 显式建表
 * - ssl: { rejectUnauthorized: false } — Supabase pooler 需要
 * - lastMessages: 20 — 不低于 20，10 会失忆
 * - workingMemory: enabled + scope='resource' — 跨会话记住用户偏好
 * - TokenLimiter（inputProcessors）— 60 万 token 收口，防 OOM
 * - 严禁 ToolCallFilter — 会剥掉历史工具结果，导致模型失忆死循环
 * - DATABASE_URL 缺失时 memory = null，agent 不挂 memory 也能启动
 */
import { Memory } from "@mastra/memory";
import { TokenLimiter } from "@mastra/core/processors";
import { PostgresStore } from "@mastra/pg";

import { env } from "@/config/env";

/* -------------------------------------------------------------------------- */
/* Working Memory 模板 — 记录用户偏好                                         */
/* -------------------------------------------------------------------------- */

const WORKING_MEMORY_TEMPLATE = `# 用户偏好档案

## 称呼与语言
- 用户称呼/昵称:
- 首选回复语言: [中文/英文/跟随用户]

## 回复风格
- 回复长度偏好: [简短/适中/详细]
- 语气偏好: [正式/随性/技术向]

## 备忘录习惯
- 常用分类/文件夹:
- 常用标签:
- 整理偏好: [按主题/按时间/按项目]

## 备注
- 其他持续性偏好:
`;

/* -------------------------------------------------------------------------- */
/* Memory 实例（降级安全）                                                      */
/* -------------------------------------------------------------------------- */

function createMemory(): Memory | null {
  if (!env.DATABASE_URL) {
    console.warn(
      "[memory] DATABASE_URL 缺失，Memory 降级为 null（无持久记忆）",
    );
    return null;
  }

  const storage = new PostgresStore({
    id: "mastra-memory-store",
    connectionString: env.DATABASE_URL,
    schemaName: "mastra",
    disableInit: true,
    ssl: { rejectUnauthorized: false },
  });

  return new Memory({
    storage,
    options: {
      lastMessages: 20,
      workingMemory: {
        enabled: true,
        scope: "resource",
        template: WORKING_MEMORY_TEMPLATE,
      },
    },
  });
}

export const mastraMemory = createMemory();

/* -------------------------------------------------------------------------- */
/* TokenLimiter — 输入处理器，60 万 token 收口                                  */
/* -------------------------------------------------------------------------- */

/**
 * 输入处理器列表。
 * 仅 Memory 启用时才有意义；Agent 构造器 conditionally 挂入。
 *
 * 严禁 ToolCallFilter：会剥掉历史工具结果，导致模型反复重调、失忆死循环。
 */
export const memoryInputProcessors = mastraMemory
  ? [new TokenLimiter({ limit: 600_000 })]
  : [];
