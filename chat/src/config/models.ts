/**
 * [INPUT]: 依赖 config/env（DEEPSEEK_API_KEY 等 provider key）
 * [OUTPUT]: 对外提供 MODEL_WHITELIST、resolveModel、toMastraModelConfig
 * [POS]: config 层；Agent 选模与 provider 配置唯一入口，key 禁止硬编码
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { OpenAICompatibleConfig } from "@mastra/core/llm";

import { env } from "./env";

/** 白名单条目：逻辑 id + OpenAI-compatible 端点元数据 */
export type ModelWhitelistEntry = {
  /** provider/model，与 Mastra model router / OpenAICompatibleConfig.id 对齐 */
  id: `${string}/${string}`;
  /** OpenAI-compatible base URL（DeepSeek 需自定义） */
  url: string;
  /** 从 env 解析 API key 的字段名（禁止把 key 写进源码） */
  apiKeyFrom: "DEEPSEEK_API_KEY";
};

/**
 * 模型白名单。
 * 未登记的 id 一律拒绝，防止任意模型字符串打穿 provider。
 */
export const MODEL_WHITELIST: Record<string, ModelWhitelistEntry> = {
  "deepseek/deepseek-chat": {
    id: "deepseek/deepseek-chat",
    url: "https://api.deepseek.com",
    apiKeyFrom: "DEEPSEEK_API_KEY",
  },
  "deepseek/deepseek-reasoner": {
    id: "deepseek/deepseek-reasoner",
    url: "https://api.deepseek.com",
    apiKeyFrom: "DEEPSEEK_API_KEY",
  },
};

/**
 * 校验模型 id 是否在白名单；通过则返回条目，否则抛错。
 */
export function resolveModel(id: string): ModelWhitelistEntry {
  const entry = MODEL_WHITELIST[id];
  if (!entry) {
    const allowed = Object.keys(MODEL_WHITELIST).join(", ");
    throw new Error(`模型不在白名单: ${id}。允许: ${allowed}`);
  }
  return entry;
}

/**
 * 将白名单条目转为 Mastra OpenAICompatibleConfig。
 * API key 只从环境变量读，永不硬编码。
 */
export function toMastraModelConfig(
  entry: ModelWhitelistEntry,
): OpenAICompatibleConfig {
  const apiKey = resolveApiKey(entry.apiKeyFrom);
  return {
    id: entry.id,
    url: entry.url,
    apiKey,
  };
}

function resolveApiKey(from: ModelWhitelistEntry["apiKeyFrom"]): string {
  switch (from) {
    case "DEEPSEEK_API_KEY":
      return env.DEEPSEEK_API_KEY;
    default: {
      const _exhaustive: never = from;
      throw new Error(`未知 apiKey 来源: ${String(_exhaustive)}`);
    }
  }
}
