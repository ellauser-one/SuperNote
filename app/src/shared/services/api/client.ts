/**
 * [INPUT]: 依赖 auth.getAccessToken 与 VITE_API_URL
 * [OUTPUT]: 对外提供 apiFetch / apiJson（自动附带 Authorization Bearer）
 * [POS]: shared/services/api 浏览器 → api 客户端；禁止直连 chat
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { getAccessToken } from "../auth/auth.service";

const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export function getApiBaseUrl(): string {
  return apiBase;
}

export function isApiConfigured(): boolean {
  return Boolean(apiBase);
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.body = body;
  }
}

export type ApiFetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
  /** 默认 true：附带 session.access_token */
  auth?: boolean;
};

/**
 * 调用业务 api。
 * 默认从 Supabase session 读取 access_token，写入 Authorization: Bearer <jwt>。
 */
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  if (!apiBase) {
    throw new ApiClientError(
      "未配置 VITE_API_URL。请在 app/.env.local 设置 api 基址（如 http://localhost:10002）。",
      0,
    );
  }

  const headers: Record<string, string> = {
    ...(options.headers ?? {}),
  };

  if (options.auth !== false) {
    const token = await getAccessToken();
    if (!token) {
      throw new ApiClientError("未登录或 session 无 access_token", 401);
    }
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.body && !headers["Content-Type"] && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const url = path.startsWith("http") ? path : `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;

  return fetch(url, {
    ...options,
    headers,
  });
}

export async function apiJson<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const res = await apiFetch(path, options);
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `API ${res.status}`;
    throw new ApiClientError(message, res.status, body);
  }

  return body as T;
}

/** GET /v1/me — 校验 JWT 链路 */
export function fetchMe() {
  return apiJson<{
    userId: string;
    email: string | null;
    profile: {
      id: string;
      email: string | null;
      username: string | null;
      displayName: string | null;
    } | null;
  }>("/v1/me");
}

/** POST /v1/ai/generate — 经 api 转发 chat（可信 user context） */
export function generateAi(message: string) {
  return apiJson<{ reply: string; userId: string }>("/v1/ai/generate", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}
