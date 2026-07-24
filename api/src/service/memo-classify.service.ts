/**
 * [INPUT]: 依赖 repository/memo、config/env、model/profile、common/app-error
 * [OUTPUT]: 对外提供 classifyMemo(authUser, memoId, authorizationHeader)
 * [POS]: service 层 memo AI 分类编排；转发用户 JWT 给 chat 服务，落库 category
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 安全：
 * - owner 校验由 repository 的 *ForUser 强制（service_role 绕过 RLS）
 * - chat 调用失败抛 HttpError(502)；日志只记状态码，绝不打印 token / key
 * - 只走 Supabase REST（service_role，服务端）落库 category
 */
import { HttpError } from "../common/app-error";
import { env } from "../config/env";
import type { AuthUser } from "../model/profile.model";
import * as memoRepo from "../repository/memo.repository";

export async function classifyMemo(
  authUser: AuthUser,
  memoId: string,
  authorizationHeader: string | undefined,
): Promise<{ nodeId: string; category: string }> {
  // owner 校验在此隐含：repository 强制 user_id 过滤
  const memo = await memoRepo.getMemoByIdForUser(authUser.id, memoId);

  // 转发用户 JWT 给 chat 服务做鉴权；不记录 token
  let res: Response;
  try {
    res = await fetch(`${env.chatBaseUrl}/v1/classify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorizationHeader ? { Authorization: authorizationHeader } : {}),
      },
      body: JSON.stringify({ title: memo.title, content: memo.content }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "network error";
    console.error("[classify] chat request failed", msg);
    throw new HttpError(502, "CLASSIFY_FAILED", "自动分类服务暂不可用");
  }

  if (!res.ok) {
    console.error("[classify] chat responded status", res.status);
    throw new HttpError(502, "CLASSIFY_FAILED", "自动分类服务暂不可用");
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    console.error("[classify] chat response not json");
    throw new HttpError(502, "CLASSIFY_FAILED", "自动分类服务暂不可用");
  }

  const category = extractCategory(body);
  if (category === null) {
    console.error("[classify] chat response missing category");
    throw new HttpError(502, "CLASSIFY_FAILED", "自动分类服务暂不可用");
  }

  const updated = await memoRepo.updateMemoCategory(
    authUser.id,
    memoId,
    category,
  );
  return { nodeId: updated.node_id, category: updated.category };
}

/** 解析 chat 信封 { code:"ok", data:{ category } }，取 category 字符串 */
function extractCategory(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;

  const rec = body as Record<string, unknown>;
  const data = rec.data;
  if (!data || typeof data !== "object") return null;

  const cat = (data as Record<string, unknown>).category;
  return typeof cat === "string" && cat.length > 0 ? cat : null;
}
