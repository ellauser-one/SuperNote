/**
 * [INPUT]: 依赖 Hono、requireAuth、dto/ai、service/ai
 * [OUTPUT]: 对外提供 POST /v1/ai/generate（JWT → 可信 user context → chat）
 * [POS]: api HTTP 层 AI 入口；浏览器只打 api，不直连 chat
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Hono } from "hono";

import type { AuthVariables } from "../common/auth-context";
import { fail, ok } from "../common/response";
import { aiGenerateBodySchema } from "../dto/ai.dto";
import { requireAuth } from "../middleware/auth";
import { ApiCode } from "../model/response.model";
import { generateAiReply } from "../service/ai.service";

export const aiApi = new Hono<{ Variables: AuthVariables }>();

aiApi.use("*", requireAuth);

aiApi.post("/generate", async (c) => {
  const auth = c.get("auth");
  const raw = await c.req.json().catch(() => null);
  const parsed = aiGenerateBodySchema.safeParse(raw);

  if (!parsed.success) {
    return fail(
      c,
      ApiCode.BAD_REQUEST,
      parsed.error.issues[0]?.message ?? "Invalid body",
      400,
    );
  }

  const result = await generateAiReply(
    { userId: auth.userId, email: auth.email },
    parsed.data.message,
  );
  return ok(c, result);
});
