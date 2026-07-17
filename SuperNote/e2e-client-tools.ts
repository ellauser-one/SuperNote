/**
 * e2e-client-tools.ts — 第八课只读客户端工具 agent loop 验收 harness
 *
 * 用法：bun e2e-client-tools.ts <seed|scenario1|scenario2|cleanup>
 *  - seed      用 Supabase admin 建测试用户，登录拿 JWT，经 api 种「工作」文件夹 + 3 条备忘录
 *  - scenario1 问「我最近记了哪些工作相关的？」→ 期望模型调 search_memos 并据结果总结
 *  - scenario2 说「把当前这条归到工作分类」→ 期望模型先 read_current_memo（read-only，只给方案）
 *  - cleanup   删除测试用户（profiles/memo_nodes 级联清空）
 *
 * 安全：env 只从文件读，密钥与 JWT 永不打印；state 文件仅本机工作目录可见。
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

/* -------------------------------------------------------------------------- */
/* env 加载（不打印）                                                            */
/* -------------------------------------------------------------------------- */

const REPO = resolve(import.meta.dir, "..");

function loadEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || m[1]!.startsWith("#")) continue;
    let v = m[2] ?? "";
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]!] = v;
  }
  return out;
}

const chatEnv = {
  ...loadEnvFile(resolve(REPO, "chat/.env")),
  ...loadEnvFile(resolve(REPO, "chat/.env.local")),
};
const apiEnv = {
  ...loadEnvFile(resolve(REPO, "api/.env")),
  ...loadEnvFile(resolve(REPO, "api/.env.local")),
};

const SUPABASE_URL = (apiEnv.SUPABASE_URL ?? chatEnv.SUPABASE_URL ?? "").replace(/\/$/, "");
const SERVICE_ROLE = apiEnv.SUPABASE_SERVICE_ROLE_KEY ?? chatEnv.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANON_KEY = chatEnv.SUPABASE_ANON_KEY ?? "";
const API_BASE = "http://localhost:20001";
const CHAT_BASE = "http://localhost:20002";
const STATE_FILE = resolve(import.meta.dir, "e2e-state.json");
const TRANSCRIPT_FILE = resolve(import.meta.dir, "e2e-transcript.md");

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("缺少 SUPABASE_URL 或 SERVICE_ROLE（api/.env* 与 chat/.env* 均未提供）");
  process.exit(1);
}

/* -------------------------------------------------------------------------- */
/* 小工具                                                                       */
/* -------------------------------------------------------------------------- */

const transcript: string[] = [];
function log(line = "") {
  transcript.push(line);
  console.log(line);
}
function flushTranscript() {
  writeFileSync(TRANSCRIPT_FILE, transcript.join("\n") + "\n");
}

function redact(s: string): string {
  // 防御：任何形似 JWT 的串一律打码
  return s.replace(/eyJ[A-Za-z0-9_\-.]+/g, "<redacted-jwt>");
}

async function apiCall<T = unknown>(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<{ status: number; data: T }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = (await res.json().catch(() => null)) as T;
  return { status: res.status, data };
}

type State = {
  userId: string;
  email: string;
  password: string;
  accessToken: string;
  workFolderId: string;
  workMemoIds: string[];
  lifeMemoId: string;
  currentMemoId: string;
};

function loadState(): State {
  return JSON.parse(readFileSync(STATE_FILE, "utf8")) as State;
}

/* -------------------------------------------------------------------------- */
/* Supabase Auth：建/删测试用户、密码登录                                         */
/* -------------------------------------------------------------------------- */

async function adminCreateUser(email: string, password: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const body = (await res.json()) as { id?: string; msg?: string; message?: string };
  if (!res.ok || !body.id) {
    throw new Error(`admin create user 失败 ${res.status}: ${redact(JSON.stringify(body))}`);
  }
  return body.id;
}

async function adminDeleteUser(userId: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  });
}

async function signIn(email: string, password: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY || SERVICE_ROLE,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json()) as { access_token?: string; error_description?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(`sign-in 失败 ${res.status}: ${body.error_description ?? "unknown"}`);
  }
  return body.access_token;
}

/* -------------------------------------------------------------------------- */
/* 镜像工具的本地实现（与 app/src/shared/services/chat/client-tools.ts 同算法）     */
/* -------------------------------------------------------------------------- */

type MemoTreeNode = {
  id: string;
  parent_id: string | null;
  node_type: "folder" | "memo";
  title: string;
  updated_at: string;
  children: MemoTreeNode[];
  memo: { excerpt: string | null; content_mdx?: string } | null;
};

type CompactMemo = {
  id: string;
  title: string;
  category: string | null;
  excerpt: string | null;
};

function flattenMemoNodes(
  nodes: MemoTreeNode[],
  parentPath: string | null = null,
): Array<{ node: MemoTreeNode; category: string | null }> {
  const out: Array<{ node: MemoTreeNode; category: string | null }> = [];
  for (const node of nodes) {
    if (node.node_type === "memo") {
      out.push({ node, category: parentPath });
      continue;
    }
    const childPath = parentPath ? `${parentPath}/${node.title}` : node.title;
    out.push(...flattenMemoNodes(node.children, childPath));
  }
  return out;
}

async function executeSearchMemos(
  token: string,
  input: { query?: string; category?: string; limit?: number },
): Promise<{ ok: boolean; memos?: CompactMemo[]; error?: string }> {
  const { status, data } = await apiCall<{ data: MemoTreeNode[] }>("GET", "/memo-tree", token);
  if (status !== 200) return { ok: false, error: `GET /memo-tree ${status}` };
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 20);
  const queryLc = input.query?.toLowerCase();
  const categoryLc = input.category?.toLowerCase();
  const memos = flattenMemoNodes(data.data)
    .filter(({ node, category }) => {
      if (categoryLc && !(category ?? "").toLowerCase().includes(categoryLc)) return false;
      if (!queryLc) return true;
      return (
        node.title.toLowerCase().includes(queryLc) ||
        (node.memo?.excerpt ?? "").toLowerCase().includes(queryLc) ||
        (category ?? "").toLowerCase().includes(queryLc)
      );
    })
    .sort((a, b) => b.node.updated_at.localeCompare(a.node.updated_at))
    .slice(0, limit)
    .map(({ node, category }) => ({
      id: node.id,
      title: node.title,
      category,
      excerpt: node.memo?.excerpt ?? null,
    }));
  return { ok: true, memos };
}

async function executeReadCurrentMemo(
  token: string,
  currentMemoId: string | null,
): Promise<{ ok: boolean; memo?: CompactMemo; error?: string }> {
  if (!currentMemoId) return { ok: false, error: "当前没有选中的备忘录" };
  const { status, data } = await apiCall<{ data: MemoTreeNode[] }>("GET", "/memo-tree", token);
  if (status !== 200) return { ok: false, error: `GET /memo-tree ${status}` };
  const hit = flattenMemoNodes(data.data).find(({ node }) => node.id === currentMemoId);
  if (!hit) return { ok: false, error: "当前没有选中的备忘录" };
  return {
    ok: true,
    memo: {
      id: hit.node.id,
      title: hit.node.title,
      category: hit.category,
      excerpt: hit.node.memo?.excerpt ?? null,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* SSE 客户端：驱动 /v1/chat，模拟前端 onToolCall → addToolResult → 自动续发       */
/* -------------------------------------------------------------------------- */

type ToolCallRecord = {
  toolCallId: string;
  toolName: string;
  input: unknown;
};

type RoundResult = {
  text: string;
  toolCalls: ToolCallRecord[];
  rawTypes: string[];
};

async function postChat(token: string, messages: unknown[]): Promise<RoundResult> {
  const res = await fetch(`${CHAT_BASE}/v1/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages, trigger: "submit-message" }),
  });
  if (!res.ok) {
    const errText = redact(await res.text());
    throw new Error(`POST /v1/chat ${res.status}: ${errText.slice(0, 500)}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  const toolCalls: ToolCallRecord[] = [];
  const rawTypes: string[] = [];

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let chunk: Record<string, unknown>;
      try {
        chunk = JSON.parse(payload) as Record<string, unknown>;
      } catch {
        continue;
      }
      const type = String(chunk.type ?? "");
      if (type) rawTypes.push(type);
      if (type === "text-delta") {
        text += String(chunk.delta ?? "");
      } else if (type === "tool-input-available") {
        toolCalls.push({
          toolCallId: String(chunk.toolCallId),
          toolName: String(chunk.toolName),
          input: chunk.input,
        });
      } else if (type === "error") {
        throw new Error(`SSE error chunk: ${redact(JSON.stringify(chunk)).slice(0, 500)}`);
      }
    }
  }
  return { text, toolCalls, rawTypes };
}

/** 一个完整「提问 → 调工具 → 回灌 → 再答」回合；返回最终文本 */
async function runConversation(
  token: string,
  userText: string,
  currentMemoId: string | null,
  heading: string,
): Promise<void> {
  log(`\n## ${heading}\n`);
  log(`**用户**: ${userText}\n`);

  const messages: unknown[] = [
    { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text: userText }] },
  ];

  for (let round = 1; round <= 5; round++) {
    log(`### 第 ${round} 轮请求 → POST /v1/chat（messages=${messages.length}）\n`);
    const { text, toolCalls, rawTypes } = await postChat(token, messages);
    const typeCounts = rawTypes.reduce<Record<string, number>>((acc, t) => {
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {});
    log("SSE chunk 类型统计: " + JSON.stringify(typeCounts) + "\n");

    if (toolCalls.length === 0) {
      log(`**助手最终回答**:\n\n${text}\n`);
      return;
    }

    // 模拟前端：onToolCall → 镜像工具 execute → addToolResult（组装 output 进消息）
    const parts: unknown[] = [];
    if (text) parts.push({ type: "text", text });
    for (const call of toolCalls) {
      log(`**模型发起工具调用**: \`${call.toolName}\`  input=${JSON.stringify(call.input)}\n`);
      let output: unknown;
      if (call.toolName === "search_memos") {
        output = await executeSearchMemos(token, (call.input ?? {}) as { query?: string; category?: string; limit?: number });
      } else if (call.toolName === "read_current_memo") {
        output = await executeReadCurrentMemo(token, currentMemoId);
      } else {
        output = { ok: false, error: `未知工具: ${call.toolName}` };
      }
      const outStr = JSON.stringify(output);
      log(`**镜像工具执行结果**（addToolResult 回灌）: ${outStr}\n`);
      if (outStr.includes("content_mdx")) {
        log("⚠️ 违规：工具结果含完整正文字段！\n");
      }
      parts.push({
        type: `tool-${call.toolName}`,
        toolCallId: call.toolCallId,
        state: "output-available",
        input: call.input ?? {},
        output,
      });
    }
    messages.push({ id: crypto.randomUUID(), role: "assistant", parts });
    log("→ 工具结果已回灌，自动发起下一轮（sendAutomaticallyWhen）\n");
  }
  log("⚠️ 超过 5 轮仍未收敛\n");
}

/* -------------------------------------------------------------------------- */
/* 子命令                                                                       */
/* -------------------------------------------------------------------------- */

async function seed() {
  const email = `e2e-tools-${Date.now()}@supernote.test`;
  const password = `e2e-${crypto.randomUUID()}!`;
  const userId = await adminCreateUser(email, password);
  const accessToken = await signIn(email, password);

  const folder = await apiCall<{ data: { id: string } }>("POST", "/memo-folders", accessToken, {
    parent_id: null,
    title: "工作",
  });
  const workFolderId = folder.data.data.id;

  const mk = (parent: string | null, title: string, content: string) =>
    apiCall<{ data: { id: string } }>("POST", "/memos", accessToken, {
      parent_id: parent,
      title,
      content_mdx: content,
    });

  const m1 = await mk(workFolderId, "Q3 定价评审纪要", "评审结论：基础版维持 $5，专业版从 $20 调到 $24，下季度观察转化。");
  const m2 = await mk(workFolderId, "发布检查单 v0.3", "灰度 10% → 观察 48h → 全量；回滚开关放在 deploy/flags。");
  const m3 = await mk(null, "周末露营清单", "帐篷、睡袋、头灯、防潮垫，周六早七点出发。");

  const state: State = {
    userId,
    email,
    password,
    accessToken,
    workFolderId,
    workMemoIds: [m1.data.data.id, m2.data.data.id],
    lifeMemoId: m3.data.data.id,
    currentMemoId: m3.data.data.id,
  };
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`seed ok: user=${email} folder=${workFolderId} memos=${state.workMemoIds.join(",")},${state.lifeMemoId}`);
}

async function scenario(n: 1 | 2) {
  const state = loadState();
  const accessToken = await signIn(state.email, state.password); // 刷新 JWT
  log(`# 第八课只读客户端工具 e2e 交互日志\n`);
  log(`- chat: ${CHAT_BASE}/v1/chat（memo-agent, clientTools 注入）`);
  log(`- api:  ${API_BASE}（GET /memo-tree，JWT）`);
  log(`- 时间: ${new Date().toISOString()}`);
  log(`- 说明: harness 模拟前端 onToolCall → 显式 addToolResult → 自动续发；密钥/JWT 已打码\n`);
  if (n === 1) {
    await runConversation(accessToken, "我最近记了哪些工作相关的？", null, "场景 1：工作相关备忘录检索");
  } else {
    await runConversation(accessToken, "把当前这条归到工作分类", state.currentMemoId, "场景 2：引用「当前这条」");
  }
  flushTranscript();
}

async function cleanup() {
  if (!existsSync(STATE_FILE)) return;
  const state = loadState();
  await adminDeleteUser(state.userId);
  unlinkSync(STATE_FILE);
  console.log("cleanup ok: 测试用户已删除（profiles/memo_nodes 级联清空）");
}

const cmd = process.argv[2];
if (cmd === "seed") await seed();
else if (cmd === "scenario1") await scenario(1);
else if (cmd === "scenario2") await scenario(2);
else if (cmd === "cleanup") await cleanup();
else {
  console.error("用法: bun e2e-client-tools.ts <seed|scenario1|scenario2|cleanup>");
  process.exit(1);
}
