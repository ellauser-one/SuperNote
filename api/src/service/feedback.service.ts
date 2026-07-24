/**
 * [INPUT]: 依赖 repository/feedback、model/profile、dto/feedback
 * [OUTPUT]: 对外提供 submitFeedback(authUser, input)
 * [POS]: service 层 feedback 编排；owner_id 来自 JWT，落库 public.feedback
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 安全：
 * - owner_id 只能来自 AuthUser（JWT），禁止 body
 * - 只走 Supabase REST（service_role，服务端）
 */
import type { AuthUser } from "../model/profile.model";
import type { FeedbackBody } from "../dto/feedback.dto";
import * as feedbackRepo from "../repository/feedback.repository";

export async function submitFeedback(
  authUser: AuthUser,
  input: FeedbackBody,
): Promise<{ id: string }> {
  return feedbackRepo.insertFeedback({
    owner_id: authUser.id,
    page: input.page ?? "unknown",
    message: input.message,
    screenshot_url: input.screenshot_url ?? null,
  });
}
