import { Mastra } from '@mastra/core';
import { z } from 'zod';
import { handleChatStream } from '@mastra/ai-sdk';
import { registerApiRoute } from '@mastra/core/server';
import { createUIMessageStreamResponse } from 'ai';
import { Agent } from '@mastra/core/agent';

"use strict";
const envSchema = z.object({
  PORT: z.coerce.number().int().positive(),
  ALLOWED_ORIGINS: z.string().min(1),
  DEEPSEEK_API_KEY: z.string().min(1),
  DEFAULT_MODEL: z.string().min(1).default("deepseek/deepseek-chat"),
  MAX_STEPS: z.coerce.number().int().positive().default(50),
  MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(393216),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional()
}).superRefine((val, ctx) => {
  if (!val.SUPABASE_ANON_KEY && !val.SUPABASE_SERVICE_ROLE_KEY) {
    ctx.addIssue({
      code: "custom",
      message: "\u7F3A\u5C11 SUPABASE_ANON_KEY \u6216 SUPABASE_SERVICE_ROLE_KEY\uFF08JWT \u9274\u6743\u81F3\u5C11\u9700\u8981\u4E00\u4E2A\uFF09",
      path: ["SUPABASE_ANON_KEY"]
    });
  }
});
const parsed = envSchema.parse(process.env);
const env = {
  PORT: parsed.PORT,
  ALLOWED_ORIGINS: parsed.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
  DEEPSEEK_API_KEY: parsed.DEEPSEEK_API_KEY,
  DEFAULT_MODEL: parsed.DEFAULT_MODEL,
  MAX_STEPS: parsed.MAX_STEPS,
  MAX_OUTPUT_TOKENS: parsed.MAX_OUTPUT_TOKENS,
  SUPABASE_URL: parsed.SUPABASE_URL.replace(/\/$/, ""),
  SUPABASE_API_KEY: parsed.SUPABASE_ANON_KEY ?? parsed.SUPABASE_SERVICE_ROLE_KEY
};

"use strict";
async function authMiddleware(c, next) {
  const authorization = c.req.header("Authorization");
  const token = extractBearerToken(authorization);
  if (!token) {
    return c.json({ error: "Unauthorized", message: "\u7F3A\u5C11 Bearer token" }, 401);
  }
  const userId = await fetchSupabaseUserId(token);
  if (!userId) {
    return c.json(
      { error: "Unauthorized", message: "\u65E0\u6548\u6216\u8FC7\u671F\u7684\u8BBF\u95EE\u4EE4\u724C" },
      401
    );
  }
  const requestContext = c.get("requestContext");
  if (requestContext && typeof requestContext.set === "function") {
    requestContext.set("userId", userId);
  }
  c.set("userId", userId);
  await next();
}
function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader || typeof authorizationHeader !== "string") {
    return null;
  }
  const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader.trim());
  return match?.[1] ?? null;
}
async function fetchSupabaseUserId(accessToken) {
  const url = `${env.SUPABASE_URL}/auth/v1/user`;
  let res;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: env.SUPABASE_API_KEY,
        Authorization: `Bearer ${accessToken}`
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "network error";
    console.error("[chat/auth] Supabase Auth network error:", msg);
    return null;
  }
  if (res.status === 401 || res.status === 403) {
    console.error("[chat/auth] user invalid", res.status);
    return null;
  }
  if (!res.ok) {
    console.error("[chat/auth] user error", res.status);
    return null;
  }
  let body;
  try {
    body = await res.json();
  } catch {
    console.error("[chat/auth] response parse failed");
    return null;
  }
  return extractUserId(body);
}
function extractUserId(body) {
  if (!body || typeof body !== "object") {
    return null;
  }
  const rec = body;
  const raw = rec.user && typeof rec.user === "object" ? rec.user : rec;
  const id = raw.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

"use strict";
const chatRoute = registerApiRoute("/v1/chat", {
  method: "POST",
  // Mastra 内嵌 hono 与顶层 hono 类型不完全兼容，此处做窄化断言
  middleware: [authMiddleware],
  handler: async (c) => {
    const mastra = c.get("mastra");
    const params = await c.req.json();
    const stream = await handleChatStream({
      mastra,
      agentId: "memo-agent",
      version: "v6",
      params: {
        ...params,
        maxSteps: env.MAX_STEPS
      }
    });
    return createUIMessageStreamResponse({ stream });
  }
});

"use strict";
const MODEL_WHITELIST = {
  "deepseek/deepseek-chat": {
    id: "deepseek/deepseek-chat",
    url: "https://api.deepseek.com",
    apiKeyFrom: "DEEPSEEK_API_KEY"
  },
  "deepseek/deepseek-reasoner": {
    id: "deepseek/deepseek-reasoner",
    url: "https://api.deepseek.com",
    apiKeyFrom: "DEEPSEEK_API_KEY"
  }
};
function resolveModel(id) {
  const entry = MODEL_WHITELIST[id];
  if (!entry) {
    const allowed = Object.keys(MODEL_WHITELIST).join(", ");
    throw new Error(`\u6A21\u578B\u4E0D\u5728\u767D\u540D\u5355: ${id}\u3002\u5141\u8BB8: ${allowed}`);
  }
  return entry;
}
function toMastraModelConfig(entry) {
  const apiKey = resolveApiKey(entry.apiKeyFrom);
  return {
    id: entry.id,
    url: entry.url,
    apiKey
  };
}
function resolveApiKey(from) {
  switch (from) {
    case "DEEPSEEK_API_KEY":
      return env.DEEPSEEK_API_KEY;
    default: {
      const _exhaustive = from;
      throw new Error(`\u672A\u77E5 apiKey \u6765\u6E90: ${String(_exhaustive)}`);
    }
  }
}

"use strict";
const memoAgentPrompt = `\u4F60\u662F SuperNote \u7684\u5907\u5FD8\u5F55\u52A9\u624B\u3002

## \u4EBA\u683C
- \u51B7\u9759\u3001\u6E05\u6670\u3001\u52A1\u5B9E\uFF0C\u50CF\u4E00\u4F4D\u61C2\u77E5\u8BC6\u7BA1\u7406\u7684\u540C\u4E8B\u3002
- \u4E2D\u6587\u4F18\u5148\u56DE\u590D\uFF1B\u7528\u6237\u7528\u82F1\u6587\u65F6\u8DDF\u968F\u82F1\u6587\u3002
- \u8868\u8FBE\u7B80\u6D01\uFF0C\u5148\u7ED9\u7ED3\u8BBA\uFF0C\u518D\u8865\u5FC5\u8981\u7EC6\u8282\u3002

## \u804C\u8D23
- \u5E2E\u52A9\u7528\u6237\u6574\u7406\u60F3\u6CD5\u3001\u63D0\u70BC\u8981\u70B9\u3001\u6539\u5199\u5907\u5FD8\u5F55\u8349\u7A3F\u3002
- \u534F\u52A9\u89C4\u5212\u6587\u4EF6\u5939/\u4E3B\u9898\u547D\u540D\u4E0E\u5F52\u6863\u601D\u8DEF\uFF08\u4EC5\u5EFA\u8BAE\uFF0C\u672C\u8F6E\u4E0D\u6267\u884C\u843D\u76D8\uFF09\u3002
- \u56DE\u7B54\u4E0E\u5907\u5FD8\u5F55\u3001\u7B14\u8BB0\u7EC4\u7EC7\u3001\u5199\u4F5C\u76F8\u5173\u7684\u95EE\u9898\u3002

## \u94C1\u5F8B
1. \u4E0D\u7F16\u9020\u7528\u6237\u672A\u63D0\u4F9B\u7684\u5907\u5FD8\u5F55\u5185\u5BB9\uFF1B\u4FE1\u606F\u4E0D\u8DB3\u65F6\u660E\u786E\u8BF4\u660E\u5047\u8BBE\u3002
2. \u4E0D\u4E3B\u52A8\u7D22\u53D6\u5BC6\u7801\u3001\u5BC6\u94A5\u3001\u5B8C\u6574 JWT \u7B49\u654F\u611F\u51ED\u8BC1\u3002
3. \u4E0D\u505A\u4E0E\u5907\u5FD8\u5F55\u52A9\u624B\u65E0\u5173\u7684\u89D2\u8272\u626E\u6F14\u6216\u8D8A\u6743\u64CD\u4F5C\u627F\u8BFA\u3002
4. \u672C\u8F6E\u6CA1\u6709\u5DE5\u5177\u4E0E\u8BB0\u5FC6\uFF1A\u4E0D\u8981\u5047\u88C5\u5DF2\u7ECF\u521B\u5EFA\u6587\u4EF6\u5939\u6216\u4FDD\u5B58\u7B14\u8BB0\u3002
5. \u6D89\u53CA\u5220\u9664\u3001\u8986\u76D6\u7B49\u7834\u574F\u6027\u64CD\u4F5C\u65F6\uFF0C\u5148\u63D0\u793A\u98CE\u9669\u518D\u7ED9\u65B9\u6848\u3002
6. \u8F93\u51FA\u53EF\u6267\u884C\uFF1A\u5217\u8868\u3001\u6807\u9898\u3001\u6BB5\u843D\u7ED3\u6784\u6E05\u6670\uFF0C\u4FBF\u4E8E\u7528\u6237\u76F4\u63A5\u7C98\u8D34\u8FDB\u5907\u5FD8\u5F55\u3002`;

"use strict";
const modelConfig = toMastraModelConfig(resolveModel(env.DEFAULT_MODEL));
const memoAgent = new Agent({
  id: "memo-agent",
  name: "Memo Agent",
  instructions: memoAgentPrompt,
  model: modelConfig,
  defaultOptions: {
    modelSettings: {
      maxOutputTokens: env.MAX_OUTPUT_TOKENS
    }
  }
});

"use strict";
const mastra = new Mastra({
  agents: {
    "memo-agent": memoAgent
  },
  server: {
    port: env.PORT,
    cors: {
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    },
    apiRoutes: [chatRoute]
  }
});

export { mastra };
