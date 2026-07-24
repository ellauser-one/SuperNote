/**
 * [INPUT]: 依赖 @mastra/core/server registerApiRoute、@mastra/core/agent Agent、
 *          config/env、config/models（resolveModel/toMastraModelConfig）、
 *          middleware/auth authMiddleware、zod
 * [OUTPUT]: 对外提供 classifyRoute — POST /v1/classify（AI 自动分类能力）
 * [POS]: routes 层；由 mastra/index server.apiRoutes 挂载；统一 JSON 信封 { code, message, data }
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 调用模式：复用项目现有模型配置 toMastraModelConfig(resolveModel(env.DEFAULT_MODEL))，
 * 构造一个轻量 Agent（无 memory/tools，无副作用），用 agent.generate 单向发分类指令。
 * 这是项目内唯一可直接触发 LLM 的方式（generateText 未从 @mastra/core 值导出）。
 *
 * 安全铁律：
 * - 日志只记错误原因 / 状态码，绝不打印 key、token 或完整 Authorization。
 * - 模型失败一律回 502 CLASSIFY_FAILED，不泄漏上游细节。
 */
import { Agent } from "@mastra/core/agent";
import { registerApiRoute } from "@mastra/core/server";
import { z } from "zod";

import { env } from "@/config/env";
import { resolveModel, toMastraModelConfig } from "@/config/models";
import { authMiddleware } from "@/middleware/auth";

/* -------------------------------------------------------------------------- */
/* 信封 helper（与 session.ts 对齐，本地自包含）                                */
/* -------------------------------------------------------------------------- */

function okJson(data: unknown, message = "ok", status = 200) {
  return Response.json({ code: "ok", message, data }, { status });
}

function failJson(code: string, message: string, status: number) {
  return Response.json({ code, message, data: null }, { status });
}

/* -------------------------------------------------------------------------- */
/* 分类 Agent — 复用项目模型配置，无 memory / tools，无副作用                    */
/* -------------------------------------------------------------------------- */

const CLASSIFY_SYSTEM = [
  "你是 SuperNote 的备忘录分类器。",
  "根据用户给出的备忘录标题与内容，返回一个简洁的分类路径字符串：",
  "用 / 分隔层级（例如 工作/项目 或 生活/旅行），不超过 2 级、不超过 20 字；",
  "若提供了 folders 候选列表，优先从中选择最匹配的（可微调）；",
  "只返回路径本身，不要解释、不要 markdown、不要代码围栏。",
].join("");

// 模块级单例：模型配置来自 env，装配一次即可
const classifyAgent = new Agent({
  id: "classify-agent",
  name: "Classify Agent",
  instructions: CLASSIFY_SYSTEM,
  model: toMastraModelConfig(resolveModel(env.DEFAULT_MODEL)),
});

/* -------------------------------------------------------------------------- */
/* 请求体校验                                                                  */
/* -------------------------------------------------------------------------- */

const classifySchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, "content 必填"),
  folders: z.array(z.string()).optional(),
});

/* -------------------------------------------------------------------------- */
/* 解析模型返回：去代码围栏、首尾空白，取首行非空                                 */
/* -------------------------------------------------------------------------- */

function parseCategory(raw: string): string {
  let s = raw.trim();
  // 去除整体代码围栏 ```lang ... ```
  const fence = /^```[a-zA-Z]*\n?([\s\S]*?)```$/;
  const m = fence.exec(s);
  if (m && m[1]) s = m[1].trim();
  // 兜底去除残留 ```
  s = s.replace(/```/g, "").trim();
  // 取第一行非空
  const line =
    s
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "";
  // 安全上限，防止模型越界
  return line.slice(0, 50);
}

/* -------------------------------------------------------------------------- */
/* POST /v1/classify                                                           */
/* -------------------------------------------------------------------------- */

export const classifyRoute = registerApiRoute("/v1/classify", {
  method: "POST",
  middleware: [authMiddleware as never],
  handler: async (c) => {
    // 1) 入参校验
    let body: z.infer<typeof classifySchema>;
    try {
      const json = await c.req.json();
      const parsed = classifySchema.safeParse(json);
      if (!parsed.success) {
        return failJson(
          "INVALID_PARAMS",
          parsed.error.issues[0]?.message ?? "参数不合法",
          400,
        );
      }
      body = parsed.data;
    } catch {
      return failJson("INVALID_PARAMS", "请求体解析失败", 400);
    }

    // 2) 组装 user 消息
    const userParts = [
      body.title ? `标题：${body.title}` : null,
      `内容：${body.content}`,
      body.folders && body.folders.length > 0
        ? `可选分类：${body.folders.join("、")}`
        : null,
    ].filter(Boolean) as string[];
    const userText = userParts.join("\n");

    // 3) 调用模型
    try {
      const result = await classifyAgent.generate(userText);
      const category = parseCategory(result.text);
      if (!category) {
        // 解析不到任何有效路径，也视为失败
        console.error("[chat/classify] empty category from model");
        return failJson("CLASSIFY_FAILED", "分类失败，请稍后重试", 502);
      }
      return okJson({ category });
    } catch (err) {
      // 只记错误原因 / 状态码，绝不打印 key、token、Authorization
      const status =
        (err as { status?: number; response?: { status?: number } })?.status ??
        (err as { response?: { status?: number } })?.response?.status ??
        undefined;
      const reason = err instanceof Error ? err.message : "unknown error";
      console.error("[chat/classify] failed:", { status, reason });
      return failJson("CLASSIFY_FAILED", "分类失败，请稍后重试", 502);
    }
  },
});
