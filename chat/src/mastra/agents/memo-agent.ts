/**
 * [INPUT]: 依赖 @mastra/core/agent、prompts/memoAgentPrompt、config/env、config/models
 * [OUTPUT]: 对外提供 memoAgent（纯聊天 Agent，无 tools / 无 memory）
 * [POS]: mastra/agents；由 mastra/index 以 key 'memo-agent' 注册
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 铁律：
 * - instructions 必须从 prompts 文件 import，禁止本文件 inline 字符串
 * - model 经白名单 resolve + toMastraModelConfig，API key 只来自 env
 */
import { Agent } from "@mastra/core/agent";

import { env } from "@/config/env";
import { resolveModel, toMastraModelConfig } from "@/config/models";
import { memoAgentPrompt } from "@/mastra/prompts";

const modelConfig = toMastraModelConfig(resolveModel(env.DEFAULT_MODEL));

/**
 * SuperNote 备忘录聊天 Agent。
 *
 * modelSettings 经 defaultOptions 注入（Mastra AgentConfig 正式入口；
 * 等价于用户契约中的 modelSettings：maxOutputTokens 等）。
 */
export const memoAgent = new Agent({
  id: "memo-agent",
  name: "Memo Agent",
  instructions: memoAgentPrompt,
  model: modelConfig,
  defaultOptions: {
    modelSettings: {
      maxOutputTokens: env.MAX_OUTPUT_TOKENS,
    },
  },
});
