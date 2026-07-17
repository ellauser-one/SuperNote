/**
 * [INPUT]: 依赖 ai DefaultChatTransport、supabase client（仅取 session token）、VITE_CHAT_BASE_URL
 * [OUTPUT]: 对外提供 createChatTransport / getChatBaseUrl / ChatClientError
 * [POS]: shared/services/chat 传输层；AgentPanel 用 useChat({ transport }) 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 约定：
 * - 只注入 Authorization: Bearer <access_token>
 * - 业务不直连 Supabase 数据；Supabase 仅用于登录态 token
 * - 非 2xx 解析 envelope，抛出带 code 的 ChatClientError
 */
import { DefaultChatTransport } from "ai";

import { supabase } from "../supabase/client";

const chatBase = (
  (import.meta.env.VITE_CHAT_BASE_URL as string | undefined) || ""
).replace(/\/$/, "");

export function getChatBaseUrl(): string {
  return chatBase;
}

export function isChatConfigured(): boolean {
  return Boolean(chatBase);
}

/** 供 UI 提示的 chat 客户端错误（带稳定 code） */
export class ChatClientError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status = 0) {
    super(message);
    this.name = "ChatClientError";
    this.code = code;
    this.status = status;
  }
}

type ErrorEnvelope = {
  code?: unknown;
  message?: unknown;
  error?: unknown;
};

/**
 * 自定义 fetch：每次请求前用 supabase.auth.getSession() 取 access_token，
 * 注入 Authorization: Bearer <token>。
 */
export async function chatFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (!chatBase) {
    throw new ChatClientError(
      "未配置 VITE_CHAT_BASE_URL。请在 app/.env.local 设置 chat 基址（如 http://localhost:20002）。",
      "CHAT_NOT_CONFIGURED",
    );
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new ChatClientError(
      "读取登录会话失败，请重新登录后再试。",
      "SESSION_ERROR",
    );
  }

  const token = session?.access_token;
  if (!token) {
    throw new ChatClientError(
      "未登录或登录已失效，请重新登录后再与助手对话。",
      "UNAUTHORIZED",
      401,
    );
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw await toChatClientError(response);
  }

  return response;
}

/**
 * 创建指向 chat 服务 /v1/chat 的 DefaultChatTransport。
 * 建议在组件外或 useMemo 中只建一次实例。
 */
export function createChatTransport() {
  // AI SDK FetchFunction ≈ typeof fetch；chatFetch 运行时签名兼容
  const fetchImpl = chatFetch as typeof fetch;

  if (!chatBase) {
    // 仍返回 transport；真正请求时 chatFetch 会抛 CHAT_NOT_CONFIGURED
    return new DefaultChatTransport({
      api: "/v1/chat",
      fetch: fetchImpl,
    });
  }

  return new DefaultChatTransport({
    api: `${chatBase}/v1/chat`,
    fetch: fetchImpl,
  });
}

async function toChatClientError(response: Response): Promise<ChatClientError> {
  const status = response.status;
  let body: ErrorEnvelope | null = null;

  try {
    const raw: unknown = await response.json();
    if (raw && typeof raw === "object") {
      body = raw as ErrorEnvelope;
    }
  } catch {
    body = null;
  }

  const code = resolveErrorCode(body, status);
  const message = resolveErrorMessage(body, status);

  return new ChatClientError(message, code, status);
}

function resolveErrorCode(body: ErrorEnvelope | null, status: number): string {
  if (body && typeof body.code === "string" && body.code.trim()) {
    return body.code.trim();
  }
  if (body && typeof body.error === "string" && body.error.trim()) {
    // chat/ 当前可能返回 { error: "Unauthorized", message: "..." }
    return body.error.trim().toUpperCase().replace(/\s+/g, "_");
  }
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "SERVER_ERROR";
  return `HTTP_${status}`;
}

function resolveErrorMessage(body: ErrorEnvelope | null, status: number): string {
  if (body && typeof body.message === "string" && body.message.trim()) {
    return body.message.trim();
  }
  if (body && typeof body.error === "string" && body.error.trim()) {
    return body.error.trim();
  }
  if (status === 401) {
    return "登录已失效，请重新登录后再试。";
  }
  return `助手服务暂时不可用（${status}）。`;
}
