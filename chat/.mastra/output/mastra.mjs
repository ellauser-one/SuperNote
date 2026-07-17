import { Mastra } from '@mastra/core';
import { z } from 'zod';
import { handleChatStream } from '@mastra/ai-sdk';
import { registerApiRoute } from '@mastra/core/server';
import { createTool } from '@mastra/core/tools';
import { createUIMessageStreamResponse } from 'ai';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { TokenLimiter } from '@mastra/core/processors';
import { PostgresStore } from '@mastra/pg';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive(),
  ALLOWED_ORIGINS: z.string().min(1),
  DEEPSEEK_API_KEY: z.string().min(1),
  DEFAULT_MODEL: z.string().min(1).default("deepseek/deepseek-chat"),
  MAX_STEPS: z.coerce.number().int().positive().default(50),
  MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(393216),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional()
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
  SUPABASE_API_KEY: parsed.SUPABASE_ANON_KEY ?? parsed.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: parsed.SUPABASE_SERVICE_ROLE_KEY ?? parsed.SUPABASE_ANON_KEY,
  DATABASE_URL: parsed.DATABASE_URL
};

const compactMemoSchema = z.object({
  id: z.string().describe("\u5907\u5FD8\u5F55\u8282\u70B9 id\uFF08memo_nodes.id\uFF09"),
  title: z.string().describe("\u5907\u5FD8\u5F55\u6807\u9898"),
  category: z.string().nullable().describe("\u6240\u5728\u6587\u4EF6\u5939\u8DEF\u5F84\uFF08\u5982\u300C\u5DE5\u4F5C/\u4F1A\u8BAE\u300D\uFF09\uFF1B\u6839\u7EA7\u5907\u5FD8\u5F55\u4E3A null"),
  excerpt: z.string().nullable().describe("\u6B63\u6587\u6458\u8981\uFF08\u670D\u52A1\u7AEF\u622A\u53D6\u7684\u524D 200 \u5B57\uFF0C\u975E\u5168\u6587\uFF09\uFF1B\u7A7A\u6B63\u6587\u4E3A null")
});
const searchMemosInputSchema = z.object({
  query: z.string().min(1).optional().describe("\u641C\u7D22\u5173\u952E\u8BCD\uFF0C\u5339\u914D\u6807\u9898\u3001\u6458\u8981\u3001\u5206\u7C7B\u8DEF\u5F84\uFF1B\u4E0D\u4F20\u5219\u6309\u6700\u8FD1\u66F4\u65B0\u5217\u51FA"),
  category: z.string().min(1).optional().describe("\u6309\u6587\u4EF6\u5939\u8DEF\u5F84\u8FC7\u6EE4\uFF08\u5982\u300C\u5DE5\u4F5C\u300D\uFF09\uFF0C\u53EF\u4E0E query \u53E0\u52A0"),
  limit: z.number().int().min(1).max(20).default(10).describe("\u8FD4\u56DE\u6761\u6570\u4E0A\u9650\uFF0C\u9ED8\u8BA4 10\uFF0C\u6700\u5927 20")
});
const searchMemosOutputSchema = z.object({
  ok: z.boolean().describe("\u641C\u7D22\u662F\u5426\u6267\u884C\u6210\u529F"),
  memos: z.array(compactMemoSchema).optional().describe("\u547D\u4E2D\u7684\u7D27\u51D1\u5907\u5FD8\u5F55\u5217\u8868\uFF08\u6309\u6700\u8FD1\u66F4\u65B0\u6392\u5E8F\uFF09\uFF1B\u5931\u8D25\u65F6\u7F3A\u7701"),
  error: z.string().optional().describe("\u5931\u8D25\u539F\u56E0\uFF1B\u6210\u529F\u65F6\u7F3A\u7701")
});
const readCurrentMemoInputSchema = z.object({});
const readCurrentMemoOutputSchema = z.object({
  ok: z.boolean().describe("\u662F\u5426\u8BFB\u5230\u5F53\u524D\u9009\u4E2D\u7684\u5907\u5FD8\u5F55"),
  memo: compactMemoSchema.optional().describe("\u5F53\u524D\u9009\u4E2D\u5907\u5FD8\u5F55\u7684\u7D27\u51D1\u89C6\u56FE\uFF1B\u672A\u9009\u4E2D\u65F6\u7F3A\u7701"),
  error: z.string().optional().describe("\u672A\u9009\u4E2D\u6216\u8BFB\u53D6\u5931\u8D25\u7684\u539F\u56E0\uFF1B\u6210\u529F\u65F6\u7F3A\u7701")
});
const writeResultMemoSchema = z.object({
  id: z.string().describe("\u5907\u5FD8\u5F55\u8282\u70B9 id"),
  title: z.string().describe("\u5907\u5FD8\u5F55\u6807\u9898"),
  category: z.string().nullable().describe("\u6240\u5728\u6587\u4EF6\u5939\u8DEF\u5F84\uFF1B\u6839\u7EA7\u4E3A null"),
  updated_at: z.string().describe("\u66F4\u65B0\u65F6\u95F4\u6233")
});
const writeResultOutputSchema = z.object({
  ok: z.boolean().describe("\u5199\u5165\u662F\u5426\u6210\u529F"),
  memo: writeResultMemoSchema.optional().describe("\u6210\u529F\u65F6\u8FD4\u56DE\u7684\u5907\u5FD8\u5F55\u6458\u8981\uFF1B\u5931\u8D25\u65F6\u7F3A\u7701"),
  error: z.string().optional().describe("\u5931\u8D25\u539F\u56E0\uFF08user_rejected / \u53EA\u8BFB / \u7F51\u7EDC\u7B49\uFF09\uFF1B\u6210\u529F\u65F6\u7F3A\u7701")
});
const createMemoInputSchema = z.object({
  title: z.string().optional().describe("\u5907\u5FD8\u5F55\u6807\u9898\uFF1B\u4E0D\u4F20\u5219\u7531\u7CFB\u7EDF\u81EA\u52A8\u751F\u6210"),
  content: z.string().describe("\u5907\u5FD8\u5F55\u6B63\u6587\u5185\u5BB9\uFF08MDX \u683C\u5F0F\uFF09"),
  category: z.string().optional().describe("\u6587\u4EF6\u5939\u8DEF\u5F84\uFF08\u5982\u300C\u5DE5\u4F5C/\u4F1A\u8BAE\u300D\uFF09\uFF1B\u4E0D\u4F20\u5219\u653E\u6839\u7EA7"),
  tags: z.array(z.string()).optional().describe("\u6807\u7B7E\u5217\u8868\uFF0C\u4FBF\u4E8E\u68C0\u7D22")
});
const createMemoOutputSchema = writeResultOutputSchema;
const updateMemoPatchSchema = z.object({
  title: z.string().optional().describe("\u65B0\u6807\u9898"),
  content: z.string().optional().describe("\u65B0\u6B63\u6587\uFF08MDX \u683C\u5F0F\uFF09"),
  category: z.string().optional().describe("\u65B0\u6587\u4EF6\u5939\u8DEF\u5F84"),
  tags: z.array(z.string()).optional().describe("\u65B0\u6807\u7B7E\u5217\u8868"),
  pinned: z.boolean().optional().describe("\u662F\u5426\u7F6E\u9876")
});
const updateMemoInputSchema = z.object({
  id: z.string().describe("\u76EE\u6807\u5907\u5FD8\u5F55\u8282\u70B9 id"),
  patch: updateMemoPatchSchema.describe("\u8981\u4FEE\u6539\u7684\u5B57\u6BB5\u5B50\u96C6")
});
const updateMemoOutputSchema = writeResultOutputSchema;
const WRITE_TOOL_PREFIXES = ["create_", "update_"];
function isWriteTool(toolName) {
  return WRITE_TOOL_PREFIXES.some((p) => toolName.startsWith(p));
}

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

class ChatDbError extends Error {
  httpStatus;
  code;
  constructor(httpStatus, code, message) {
    super(message);
    this.name = "ChatDbError";
    this.httpStatus = httpStatus;
    this.code = code;
  }
}
async function supabaseRest(path, options = {}) {
  const method = options.method ?? "GET";
  const base = env.SUPABASE_URL.replace(/\/$/, "");
  const clean = path.replace(/^\//, "");
  const url = new URL(`${base}/rest/v1/${clean}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, value);
    }
  }
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...options.headers ?? {}
  };
  if (options.returnRepresentation) {
    headers.Prefer = "return=representation";
  }
  if (options.onConflict) {
    headers.Prefer = headers.Prefer ? `${headers.Prefer},resolution=merge-duplicates` : "resolution=merge-duplicates";
    url.searchParams.set("on_conflict", options.onConflict);
  }
  let res;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: options.body === void 0 ? void 0 : JSON.stringify(options.body)
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "network error";
    console.error("[chat/db] fetch failed", method, path);
    throw new ChatDbError(502, "SUPABASE_REST_ERROR", `Supabase REST network error: ${msg}`);
  }
  if (!res.ok) {
    const text2 = await res.text().catch(() => "");
    const message = extractPostgrestMessage(text2) || `Supabase REST ${res.status}`;
    console.error("[chat/db]", method, path, res.status);
    throw new ChatDbError(502, "SUPABASE_REST_ERROR", message);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
class PostgrestQueryBuilder {
  params = {};
  select(columns) {
    this.params.select = columns;
    return this;
  }
  eq(column, value) {
    this.params[column] = `eq.${value}`;
    return this;
  }
  neq(column, value) {
    this.params[column] = `neq.${value}`;
    return this;
  }
  /** PostgREST is.* 过滤器 */
  is(column, value) {
    this.params[column] = `is.${value}`;
    return this;
  }
  /** 排序；可链式多次调用（order=a.asc,b.desc） */
  order(column, ascending = true) {
    const part = `${column}.${ascending ? "asc" : "desc"}`;
    this.params.order = this.params.order ? `${this.params.order},${part}` : part;
    return this;
  }
  limit(n) {
    this.params.limit = String(n);
    return this;
  }
  offset(n) {
    this.params.offset = String(n);
    return this;
  }
  /** PostgREST lt.* 过滤器（游标分页用） */
  lt(column, value) {
    this.params[column] = `lt.${value}`;
    return this;
  }
  build() {
    return { ...this.params };
  }
}
function createPostgrestQuery() {
  return new PostgrestQueryBuilder();
}
function extractPostgrestMessage(body) {
  if (!body) return null;
  if (typeof body === "string") {
    const trimmed = body.trim();
    if (!trimmed) return null;
    try {
      return extractPostgrestMessage(JSON.parse(trimmed));
    } catch {
      return trimmed;
    }
  }
  if (typeof body === "object") {
    const rec = body;
    if (typeof rec.message === "string" && rec.message.trim()) return rec.message.trim();
    if (typeof rec.error === "string" && rec.error.trim()) return rec.error.trim();
    if (typeof rec.msg === "string" && rec.msg.trim()) return rec.msg.trim();
  }
  return null;
}

function encodeCursor(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}
function decodeCursor(cursor) {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf-8");
    const obj = JSON.parse(json);
    if (!obj.created_at || !obj.id) throw new Error("invalid cursor");
    return obj;
  } catch {
    throw new ChatDbError(400, "INVALID_CURSOR", "\u65E0\u6548\u7684\u5206\u9875\u6E38\u6807");
  }
}
const SESSION_COLUMNS = "id,user_id,title,title_source,model,deleted_at,created_at,updated_at";
async function listSessions(userId, limit = 50) {
  const q = createPostgrestQuery().select(SESSION_COLUMNS).eq("user_id", userId).is("deleted_at", "null").order("updated_at", false).limit(limit).build();
  return await supabaseRest("chat_sessions", { query: q }) ?? [];
}
async function createSession(userId, input) {
  const rows = await supabaseRest("chat_sessions", {
    method: "POST",
    body: {
      user_id: userId,
      title: input.title ?? "\u65B0\u5BF9\u8BDD",
      ...input.model ? { model: input.model } : {}
    },
    returnRepresentation: true,
    query: { select: SESSION_COLUMNS }
  });
  if (!rows?.[0]) throw new ChatDbError(500, "SESSION_CREATE_FAILED", "\u4F1A\u8BDD\u521B\u5EFA\u5931\u8D25");
  return rows[0];
}
async function updateSession(userId, sessionId, patch) {
  const body = {};
  if (patch.title !== void 0) {
    body.title = patch.title;
    body.title_source = "user";
  }
  if (patch.model !== void 0) body.model = patch.model;
  const q = createPostgrestQuery().eq("id", sessionId).eq("user_id", userId).is("deleted_at", "null").build();
  const rows = await supabaseRest("chat_sessions", {
    method: "PATCH",
    body,
    returnRepresentation: true,
    query: { ...q, select: SESSION_COLUMNS }
  });
  if (!rows?.[0]) throw new ChatDbError(404, "SESSION_NOT_FOUND", "\u4F1A\u8BDD\u4E0D\u5B58\u5728");
  return rows[0];
}
async function softDeleteSession(userId, sessionId) {
  const q = createPostgrestQuery().eq("id", sessionId).eq("user_id", userId).is("deleted_at", "null").build();
  const rows = await supabaseRest("chat_sessions", {
    method: "PATCH",
    body: { deleted_at: (/* @__PURE__ */ new Date()).toISOString() },
    returnRepresentation: true,
    query: { ...q, select: "id" }
  });
  if (!rows?.[0]) throw new ChatDbError(404, "SESSION_NOT_FOUND", "\u4F1A\u8BDD\u4E0D\u5B58\u5728");
}
const MESSAGE_COLUMNS = "id,session_id,user_id,client_id,role,content,created_at";
async function upsertMessages(userId, sessionId, messages) {
  if (messages.length === 0) return [];
  const body = messages.map((m) => ({
    session_id: sessionId,
    user_id: userId,
    client_id: m.client_id,
    role: m.role,
    content: m.content
  }));
  const rows = await supabaseRest("chat_messages", {
    method: "POST",
    body,
    returnRepresentation: true,
    onConflict: "session_id,client_id",
    query: { select: MESSAGE_COLUMNS }
  });
  return rows ?? [];
}
async function listMessages(userId, sessionId, options = {}) {
  const limit = options.limit ?? 50;
  const fetchLimit = limit + 1;
  const q = createPostgrestQuery().select(MESSAGE_COLUMNS).eq("session_id", sessionId).eq("user_id", userId).order("created_at", false).order("id", false).limit(fetchLimit).build();
  if (options.before) {
    const cursor = decodeCursor(options.before);
    q["or"] = `(created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id}))`;
  }
  const rows = await supabaseRest("chat_messages", { query: q }) ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  page.reverse();
  const nextCursor = hasMore ? encodeCursor({ created_at: page[0].created_at, id: page[0].id }) : null;
  return { messages: page, nextCursor };
}
async function touchSession(userId, sessionId) {
  const q = createPostgrestQuery().eq("id", sessionId).eq("user_id", userId).build();
  await supabaseRest("chat_sessions", {
    method: "PATCH",
    body: { updated_at: (/* @__PURE__ */ new Date()).toISOString() },
    query: q
  });
}

const READ_TOOLS = {
  search_memos: createTool({
    id: "search_memos",
    description: "\u641C\u7D22\u5F53\u524D\u767B\u5F55\u7528\u6237\u7684\u5907\u5FD8\u5F55\uFF0C\u8FD4\u56DE\u7D27\u51D1\u5217\u8868\uFF08id/\u6807\u9898/\u5206\u7C7B/\u6458\u8981\uFF0C\u65E0\u5B8C\u6574\u6B63\u6587\uFF09\u3002\u9700\u8981\u4E86\u89E3\u7528\u6237\u5DF2\u6709\u5907\u5FD8\u5F55\u65F6\u8C03\u7528\u3002",
    inputSchema: searchMemosInputSchema,
    outputSchema: searchMemosOutputSchema
  }),
  read_current_memo: createTool({
    id: "read_current_memo",
    description: "\u8BFB\u53D6\u7528\u6237\u5F53\u524D\u5728\u524D\u7AEF\u9009\u4E2D/\u6253\u5F00\u7684\u90A3\u6761\u5907\u5FD8\u5F55\u7684\u7D27\u51D1\u89C6\u56FE\u3002\u7528\u6237\u5F15\u7528\u300C\u5F53\u524D\u8FD9\u6761\u300D\u300C\u8FD9\u6761\u5907\u5FD8\u5F55\u300D\u65F6\u5148\u8C03\u7528\u3002",
    inputSchema: readCurrentMemoInputSchema,
    outputSchema: readCurrentMemoOutputSchema
  })
};
const WRITE_TOOLS = {
  create_memo: createTool({
    id: "create_memo",
    description: "\u521B\u5EFA\u65B0\u5907\u5FD8\u5F55\u3002\u524D\u7AEF\u4F1A\u5F39\u51FA\u786E\u8BA4\u5361\uFF0C\u7528\u6237\u786E\u8BA4\u540E\u624D\u771F\u6B63\u5199\u5165\u3002\u5FC5\u987B\u5148\u8C03 search_memos \u786E\u8BA4\u65E0\u91CD\u590D\u3002",
    inputSchema: createMemoInputSchema,
    outputSchema: createMemoOutputSchema
  }),
  update_memo: createTool({
    id: "update_memo",
    description: "\u4FEE\u6539\u5DF2\u6709\u5907\u5FD8\u5F55\u7684\u6807\u9898\u3001\u6B63\u6587\u3001\u5206\u7C7B\u3001\u6807\u7B7E\u6216\u7F6E\u9876\u72B6\u6001\u3002\u524D\u7AEF\u4F1A\u5F39\u51FA\u786E\u8BA4\u5361\uFF0C\u7528\u6237\u786E\u8BA4\u540E\u624D\u771F\u6B63\u5199\u5165\u3002",
    inputSchema: updateMemoInputSchema,
    outputSchema: updateMemoOutputSchema
  })
};
function buildClientTools(canWrite) {
  return { ...READ_TOOLS, ...WRITE_TOOLS };
}
const chatRoute = registerApiRoute("/v1/chat", {
  method: "POST",
  // Mastra 内嵌 hono 与顶层 hono 类型不完全兼容，此处做窄化断言
  middleware: [authMiddleware],
  handler: async (c) => {
    const mastra = c.get("mastra");
    const userId = c.get("userId");
    const params = await c.req.json();
    const sessionId = params.sessionId;
    const incomingMessages = params.messages ?? [];
    let resolvedSessionId = sessionId;
    if (userId && incomingMessages.length > 0) {
      try {
        if (!resolvedSessionId) {
          const session = await createSession(userId, {
            model: params.model ?? env.DEFAULT_MODEL
          });
          resolvedSessionId = session.id;
        }
        const userMsgs = incomingMessages.filter((m) => m.role === "user").map((m) => ({
          client_id: m.client_id ?? m.id ?? crypto.randomUUID(),
          role: "user",
          content: m.parts ?? m.content ?? []
        }));
        if (userMsgs.length > 0) {
          await upsertMessages(userId, resolvedSessionId, userMsgs);
          console.log("[chat/persist] user messages upserted", {
            sessionId: resolvedSessionId,
            count: userMsgs.length
          });
        }
      } catch (err) {
        console.error("[chat/persist] user message upsert failed:", err);
      }
    }
    const stream = await handleChatStream({
      mastra,
      agentId: "memo-agent",
      version: "v6",
      params: {
        ...params,
        maxSteps: env.MAX_STEPS,
        clientTools: buildClientTools(),
        // 仅当 sessionId 和 userId 都存在时才挂 memory 域
        ...resolvedSessionId && userId ? {
          memory: {
            resource: userId,
            thread: resolvedSessionId
          }
        } : {}
      }
    });
    const [clientStream, persistStream] = stream.tee();
    if (resolvedSessionId && userId) {
      const sid = resolvedSessionId;
      const uid = userId;
      consumeAndPersist(persistStream, sid, uid).catch((err) => {
        console.error("[chat/persist] assistant persist background error:", err);
      });
    }
    return createUIMessageStreamResponse({ stream: clientStream });
  }
});
const MAX_PERSIST_RETRIES = 2;
async function consumeAndPersist(stream, sessionId, userId) {
  const reader = stream.getReader();
  const textParts = [];
  let assistantClientId = null;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value;
      const type = chunk.type;
      if (type === "start" && chunk.messageId) {
        assistantClientId = `assistant-${chunk.messageId}`;
      }
      if ((type === "text" || type === "text-delta") && typeof chunk.text === "string") {
        textParts.push(chunk.text);
      }
    }
  } catch (err) {
    console.error("[chat/persist] stream read error:", err);
    return;
  }
  if (!assistantClientId || textParts.length === 0) {
    console.log("[chat/persist] no assistant content to persist");
    return;
  }
  const content = [{ type: "text", text: textParts.join("") }];
  console.log("[chat/persist] persisting assistant message", {
    sessionId,
    contentLength: textParts.join("").length
  });
  for (let attempt = 0; attempt <= MAX_PERSIST_RETRIES; attempt++) {
    try {
      await upsertMessages(userId, sessionId, [
        { client_id: assistantClientId, role: "assistant", content }
      ]);
      await touchSession(userId, sessionId);
      console.log("[chat/persist] assistant message persisted");
      return;
    } catch (err) {
      console.error(
        `[chat/persist] assistant persist attempt ${attempt + 1} failed:`,
        err
      );
      if (attempt < MAX_PERSIST_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  console.error("[chat/persist] assistant persist exhausted retries");
}

function okJson$1(data, message = "ok", status = 200) {
  return Response.json({ code: "ok", message, data }, { status });
}
function failJson$1(code, message, status) {
  return Response.json({ code, message, data: null }, { status });
}
const listRoute = registerApiRoute("/v1/sessions", {
  method: "GET",
  middleware: [authMiddleware],
  handler: async (c) => {
    const userId = c.get("userId");
    try {
      const sessions = await listSessions(userId);
      return okJson$1(sessions);
    } catch (err) {
      if (err instanceof ChatDbError) return failJson$1(err.code, err.message, err.httpStatus);
      console.error("[chat/session] list error", err);
      return failJson$1("INTERNAL_ERROR", "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF", 500);
    }
  }
});
const createRoute = registerApiRoute("/v1/sessions", {
  method: "POST",
  middleware: [authMiddleware],
  handler: async (c) => {
    const userId = c.get("userId");
    try {
      const body = await c.req.json();
      const session = await createSession(userId, body);
      return okJson$1(session, "created", 201);
    } catch (err) {
      if (err instanceof ChatDbError) return failJson$1(err.code, err.message, err.httpStatus);
      console.error("[chat/session] create error", err);
      return failJson$1("INTERNAL_ERROR", "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF", 500);
    }
  }
});
const updateRoute = registerApiRoute("/v1/sessions/:id", {
  method: "PATCH",
  middleware: [authMiddleware],
  handler: async (c) => {
    const userId = c.get("userId");
    const sessionId = c.req.param("id");
    try {
      const body = await c.req.json();
      const session = await updateSession(userId, sessionId, body);
      return okJson$1(session);
    } catch (err) {
      if (err instanceof ChatDbError) return failJson$1(err.code, err.message, err.httpStatus);
      console.error("[chat/session] update error", err);
      return failJson$1("INTERNAL_ERROR", "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF", 500);
    }
  }
});
const deleteRoute = registerApiRoute("/v1/sessions/:id", {
  method: "DELETE",
  middleware: [authMiddleware],
  handler: async (c) => {
    const userId = c.get("userId");
    const sessionId = c.req.param("id");
    try {
      await softDeleteSession(userId, sessionId);
      return okJson$1(null, "deleted");
    } catch (err) {
      if (err instanceof ChatDbError) return failJson$1(err.code, err.message, err.httpStatus);
      console.error("[chat/session] delete error", err);
      return failJson$1("INTERNAL_ERROR", "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF", 500);
    }
  }
});
const sessionRoutes = [listRoute, createRoute, updateRoute, deleteRoute];

function okJson(data, message = "ok", status = 200) {
  return Response.json({ code: "ok", message, data }, { status });
}
function failJson(code, message, status) {
  return Response.json({ code, message, data: null }, { status });
}
const sessionMessagesRoute = registerApiRoute("/v1/sessions/:id/messages", {
  method: "GET",
  middleware: [authMiddleware],
  handler: async (c) => {
    const userId = c.get("userId");
    const sessionId = c.req.param("id");
    const url = new URL(c.req.url);
    const before = url.searchParams.get("before") ?? void 0;
    const limitStr = url.searchParams.get("limit");
    const limit = limitStr ? Math.min(Math.max(Number(limitStr) || 50, 1), 100) : 50;
    try {
      const result = await listMessages(userId, sessionId, { before, limit });
      return okJson(result);
    } catch (err) {
      if (err instanceof ChatDbError) return failJson(err.code, err.message, err.httpStatus);
      console.error("[chat/messages] list error", err);
      return failJson("INTERNAL_ERROR", "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF", 500);
    }
  }
});

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

const memoAgentPrompt = `\u4F60\u662F SuperNote \u7684\u5907\u5FD8\u5F55\u52A9\u624B\u3002

## \u4EBA\u683C
- \u51B7\u9759\u3001\u6E05\u6670\u3001\u52A1\u5B9E\uFF0C\u50CF\u4E00\u4F4D\u61C2\u77E5\u8BC6\u7BA1\u7406\u7684\u540C\u4E8B\u3002
- \u4E2D\u6587\u4F18\u5148\u56DE\u590D\uFF1B\u7528\u6237\u7528\u82F1\u6587\u65F6\u8DDF\u968F\u82F1\u6587\u3002
- \u8868\u8FBE\u7B80\u6D01\uFF0C\u5148\u7ED9\u7ED3\u8BBA\uFF0C\u518D\u8865\u5FC5\u8981\u7EC6\u8282\u3002

## \u804C\u8D23
- \u5E2E\u52A9\u7528\u6237\u6574\u7406\u60F3\u6CD5\u3001\u63D0\u70BC\u8981\u70B9\u3001\u6539\u5199\u5907\u5FD8\u5F55\u8349\u7A3F\u3002
- \u534F\u52A9\u89C4\u5212\u6587\u4EF6\u5939/\u4E3B\u9898\u547D\u540D\u4E0E\u5F52\u6863\u601D\u8DEF\u3002
- \u901A\u8FC7\u5DE5\u5177\u5B9E\u9645\u521B\u5EFA\u548C\u4FEE\u6539\u5907\u5FD8\u5F55\uFF08\u5199\u5165\u524D\u9700\u7528\u6237\u786E\u8BA4\uFF09\u3002

## \u53EA\u8BFB\u5DE5\u5177
- search_memos\uFF1A\u9700\u8981\u4E86\u89E3\u7528\u6237\u5DF2\u6709\u5907\u5FD8\u5F55\u65F6\u8C03\u7528\u3002\u53EF\u6309\u5173\u952E\u8BCD\u3001\u5206\u7C7B\u3001\u6761\u6570\u68C0\u7D22\u3002
- read_current_memo\uFF1A\u7528\u6237\u5F15\u7528\u300C\u5F53\u524D\u8FD9\u6761\u300D\u300C\u8FD9\u6761\u5907\u5FD8\u5F55\u300D\u65F6\u5148\u8C03\u7528\u3002
- \u5DE5\u5177\u7ED3\u679C\u8FD4\u56DE\u524D\uFF0C\u7981\u6B62\u7F16\u9020\u4EFB\u4F55\u5907\u5FD8\u5F55\u7684\u6807\u9898\u3001\u5206\u7C7B\u6216\u5185\u5BB9\uFF1B\u7ED3\u679C\u4E3A\u7A7A\u5C31\u5982\u5B9E\u8BF4\u660E\u3002

## \u5199\u5165\u5DE5\u5177
- create_memo\uFF1A\u521B\u5EFA\u65B0\u5907\u5FD8\u5F55\u3002\u5EFA\u8BAE\u5148\u7528 search_memos \u786E\u8BA4\u65E0\u91CD\u590D\u3002
  - \u7528\u6237\u8BF4\u300C\u5E2E\u6211\u8BB0\u4E00\u4E0B\u300D\u300C\u65B0\u5EFA\u5907\u5FD8\u5F55\u300D\u65F6\u8C03\u7528\u3002
  - \u524D\u7AEF\u4F1A\u5F39\u51FA\u786E\u8BA4\u5361\uFF0C\u7528\u6237\u786E\u8BA4\u540E\u624D\u4F1A\u771F\u6B63\u5199\u5165\u3002
- update_memo\uFF1A\u4FEE\u6539\u5DF2\u6709\u5907\u5FD8\u5F55\u3002\u5FC5\u987B\u5148\u7528 read_current_memo \u6216 search_memos \u62FF\u5230\u76EE\u6807 id\u3002
  - \u652F\u6301\u4FEE\u6539\u6807\u9898\u3001\u6B63\u6587\u3001\u5206\u7C7B\u3001\u6807\u7B7E\u3001\u7F6E\u9876\u3002
  - \u524D\u7AEF\u4F1A\u5F39\u51FA\u786E\u8BA4\u5361\uFF0C\u7528\u6237\u786E\u8BA4\u540E\u624D\u4F1A\u771F\u6B63\u5199\u5165\u3002

## \u5199\u5165\u94C1\u5F8B
1. \u7EDD\u4E0D\u5047\u88C5\u5DF2\u5199\u5165\u2014\u2014\u5FC5\u987B\u7B49 tool result \u56DE\u6765\u518D\u544A\u8BC9\u7528\u6237\u7ED3\u679C\u3002
2. \u88AB\u7528\u6237\u62D2\u7EDD\u540E\u793C\u8C8C\u786E\u8BA4\uFF08\u300C\u597D\u7684\uFF0C\u5DF2\u53D6\u6D88\u300D\uFF09\uFF0C\u4E0D\u5F3A\u884C\u91CD\u8BD5\u540C\u4E00\u5199\u5165\u3002
3. \u53EF\u4EE5\u6362\u4E00\u79CD\u8868\u8FF0\u65B9\u5F0F\u5EFA\u8BAE\u7528\u6237\uFF0C\u4F46\u4E0D\u5F97\u518D\u6B21\u8C03\u7528\u540C\u4E00\u5199\u5165\u5DE5\u5177\uFF08\u9488\u5BF9\u540C\u4E00\u5185\u5BB9\uFF09\u3002

## \u901A\u7528\u94C1\u5F8B
1. \u4E0D\u7F16\u9020\u7528\u6237\u672A\u63D0\u4F9B\u7684\u5907\u5FD8\u5F55\u5185\u5BB9\uFF1B\u4FE1\u606F\u4E0D\u8DB3\u65F6\u660E\u786E\u8BF4\u660E\u5047\u8BBE\u3002
2. \u4E0D\u4E3B\u52A8\u7D22\u53D6\u5BC6\u7801\u3001\u5BC6\u94A5\u3001\u5B8C\u6574 JWT \u7B49\u654F\u611F\u51ED\u8BC1\u3002
3. \u4E0D\u505A\u4E0E\u5907\u5FD8\u5F55\u52A9\u624B\u65E0\u5173\u7684\u89D2\u8272\u626E\u6F14\u6216\u8D8A\u6743\u64CD\u4F5C\u627F\u8BFA\u3002
4. \u6D89\u53CA\u5220\u9664\u3001\u8986\u76D6\u7B49\u7834\u574F\u6027\u64CD\u4F5C\u65F6\uFF0C\u5148\u63D0\u793A\u98CE\u9669\u518D\u7ED9\u65B9\u6848\u3002
5. \u8F93\u51FA\u53EF\u6267\u884C\uFF1A\u5217\u8868\u3001\u6807\u9898\u3001\u6BB5\u843D\u7ED3\u6784\u6E05\u6670\uFF0C\u4FBF\u4E8E\u7528\u6237\u76F4\u63A5\u4F7F\u7528\u3002`;

const WORKING_MEMORY_TEMPLATE = `# \u7528\u6237\u504F\u597D\u6863\u6848

## \u79F0\u547C\u4E0E\u8BED\u8A00
- \u7528\u6237\u79F0\u547C/\u6635\u79F0:
- \u9996\u9009\u56DE\u590D\u8BED\u8A00: [\u4E2D\u6587/\u82F1\u6587/\u8DDF\u968F\u7528\u6237]

## \u56DE\u590D\u98CE\u683C
- \u56DE\u590D\u957F\u5EA6\u504F\u597D: [\u7B80\u77ED/\u9002\u4E2D/\u8BE6\u7EC6]
- \u8BED\u6C14\u504F\u597D: [\u6B63\u5F0F/\u968F\u6027/\u6280\u672F\u5411]

## \u5907\u5FD8\u5F55\u4E60\u60EF
- \u5E38\u7528\u5206\u7C7B/\u6587\u4EF6\u5939:
- \u5E38\u7528\u6807\u7B7E:
- \u6574\u7406\u504F\u597D: [\u6309\u4E3B\u9898/\u6309\u65F6\u95F4/\u6309\u9879\u76EE]

## \u5907\u6CE8
- \u5176\u4ED6\u6301\u7EED\u6027\u504F\u597D:
`;
function createMemory() {
  if (!env.DATABASE_URL) {
    console.warn(
      "[memory] DATABASE_URL \u7F3A\u5931\uFF0CMemory \u964D\u7EA7\u4E3A null\uFF08\u65E0\u6301\u4E45\u8BB0\u5FC6\uFF09"
    );
    return null;
  }
  const storage = new PostgresStore({
    id: "mastra-memory-store",
    connectionString: env.DATABASE_URL,
    schemaName: "mastra",
    disableInit: true,
    ssl: { rejectUnauthorized: false }
  });
  return new Memory({
    storage,
    options: {
      lastMessages: 20,
      workingMemory: {
        enabled: true,
        scope: "resource",
        template: WORKING_MEMORY_TEMPLATE
      }
    }
  });
}
const mastraMemory = createMemory();
const memoryInputProcessors = mastraMemory ? [new TokenLimiter({ limit: 6e5 })] : [];

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
  },
  // 条件挂 memory：DATABASE_URL 缺失时 mastraMemory=null，不挂也能启动
  ...mastraMemory ? { memory: mastraMemory } : {},
  // TokenLimiter 收口 60 万 token；严禁 ToolCallFilter
  ...memoryInputProcessors.length > 0 ? { inputProcessors: memoryInputProcessors } : {}
});

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
    apiRoutes: [chatRoute, ...sessionRoutes, sessionMessagesRoute]
  }
});

export { WRITE_TOOL_PREFIXES as W, createMemoInputSchema as a, createMemoOutputSchema as b, compactMemoSchema as c, readCurrentMemoOutputSchema as d, searchMemosOutputSchema as e, updateMemoOutputSchema as f, updateMemoPatchSchema as g, writeResultOutputSchema as h, isWriteTool as i, mastra as m, readCurrentMemoInputSchema as r, searchMemosInputSchema as s, updateMemoInputSchema as u, writeResultMemoSchema as w };
