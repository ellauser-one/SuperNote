/**
 * [INPUT]: 依赖 lib/supabase-rest、common/app-error
 * [OUTPUT]: 对外提供 insertFeedback
 * [POS]: repository 层 feedback；只走 supabase-rest，无业务权限
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 约定：
 * - owner_id 由 service 注入（来自 JWT），此层不校验归属
 * - Prefer: return=representation 返回写入后的行
 * - 禁止 supabase-js 客户端 / 连接串
 */
import { HttpError } from "../common/app-error";
import { supabaseRest } from "../lib/supabase-rest";

const TABLE = "feedback";

export type FeedbackInsert = {
  owner_id: string | null;
  page: string;
  message: string;
  screenshot_url?: string | null;
};

export async function insertFeedback(
  row: FeedbackInsert,
): Promise<{ id: string }> {
  const created = await supabaseRest<Record<string, unknown>[]>(TABLE, {
    method: "POST",
    body: {
      owner_id: row.owner_id,
      page: row.page,
      message: row.message,
      screenshot_url: row.screenshot_url ?? null,
    },
    returnRepresentation: true,
  });

  const first = Array.isArray(created) ? created[0] : null;
  if (!first) {
    throw new HttpError(502, "SUPABASE_REST_ERROR", "创建反馈后未返回行");
  }
  return { id: String(first.id) };
}
