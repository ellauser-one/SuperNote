/**
 * [INPUT]: 依赖 config/env（SUPABASE_URL + API key）、Mastra/Hono Context
 * [OUTPUT]: 对外提供 authMiddleware；成功时把 userId 写入 requestContext
 * [POS]: middleware 鉴权边界；身份只信 Authorization Bearer JWT，绝不从 body 读 userId
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 类型说明：不直接 import 顶层 `hono` 包，避免与 @mastra/core 内嵌 hono 类型双实例冲突。
 */
import { env } from "@/config/env";

type AuthContext = {
  req: { header: (name: string) => string | undefined };
  json: (body: unknown, status?: number) => Response;
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
};

/**
 * 从 Authorization: Bearer <token> 取 JWT，
 * 经 Supabase Auth /auth/v1/user 换出可信 userId，
 * 写入 c.get('requestContext')。
 *
 * 无 token / 非法 token → 401。
 */
export async function authMiddleware(
  c: AuthContext,
  next: () => Promise<void>,
): Promise<Response | void> {
  const authorization = c.req.header("Authorization");
  const token = extractBearerToken(authorization);

  if (!token) {
    return c.json({ error: "Unauthorized", message: "缺少 Bearer token" }, 401);
  }

  const userId = await fetchSupabaseUserId(token);
  if (!userId) {
    return c.json(
      { error: "Unauthorized", message: "无效或过期的访问令牌" },
      401,
    );
  }

  const requestContext = c.get("requestContext") as
    | { set: (key: string, value: unknown) => void }
    | undefined;

  if (requestContext && typeof requestContext.set === "function") {
    requestContext.set("userId", userId);
  }

  // 便于 handler / 后续中间件读取（不替代 requestContext）
  c.set("userId", userId);

  await next();
}

function extractBearerToken(
  authorizationHeader: string | undefined | null,
): string | null {
  if (!authorizationHeader || typeof authorizationHeader !== "string") {
    return null;
  }
  const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader.trim());
  return match?.[1] ?? null;
}

/**
 * 用用户 JWT 调 Supabase Auth，返回 user.id。
 * 失败返回 null（由上层统一 401）。
 * 日志只记 status，不打印 token。
 */
async function fetchSupabaseUserId(accessToken: string): Promise<string | null> {
  const url = `${env.SUPABASE_URL}/auth/v1/user`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: env.SUPABASE_API_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
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

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    console.error("[chat/auth] response parse failed");
    return null;
  }

  return extractUserId(body);
}

function extractUserId(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const rec = body as Record<string, unknown>;
  const raw =
    rec.user && typeof rec.user === "object"
      ? (rec.user as Record<string, unknown>)
      : rec;
  const id = raw.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}
