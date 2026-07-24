/**
 * [INPUT]: 依赖 Hono、dto/feedback、service/feedback、lib/supabase-auth、common/response
 * [OUTPUT]: 对外提供 feedbackRouter（POST /feedback → 挂载于 /api → /api/feedback）
 * [POS]: router 层；读请求、zod 校验、调 service、返回信封；禁止业务判断
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Context } from "hono";
import { Hono } from "hono";

import { fail, ok } from "../common/response";
import {
  FORBIDDEN_FEEDBACK_ID_KEYS,
  feedbackBodySchema,
} from "../dto/feedback.dto";
import {
  extractBearerToken,
  fetchAuthUser,
} from "../lib/supabase-auth";
import * as feedbackService from "../service/feedback.service";

export const feedbackRouter = new Hono();

async function requireAuthUser(c: Context) {
  const token = extractBearerToken(c.req.header("Authorization"));
  return fetchAuthUser(token);
}

type ParsedBody =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; response: Response };

/** 解析 JSON body；拒绝身份字段 */
async function parseBodyObject(c: Context): Promise<ParsedBody> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return {
      ok: false,
      response: fail(c, "VALIDATION_ERROR", "请求体必须是 JSON", 400),
    };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      response: fail(c, "VALIDATION_ERROR", "请求体必须是 JSON 对象", 400),
    };
  }

  const rec = body as Record<string, unknown>;
  for (const key of FORBIDDEN_FEEDBACK_ID_KEYS) {
    if (Object.prototype.hasOwnProperty.call(rec, key)) {
      return {
        ok: false,
        response: fail(
          c,
          "VALIDATION_ERROR",
          `不允许在 body 中传入 ${key}`,
          400,
        ),
      };
    }
  }

  return { ok: true, body: rec };
}

/** POST /feedback → /api/feedback */
feedbackRouter.post("/feedback", async (c) => {
  const authUser = await requireAuthUser(c);
  const parsedBody = await parseBodyObject(c);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = feedbackBodySchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return fail(
      c,
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "请求体校验失败",
      400,
    );
  }

  const result = await feedbackService.submitFeedback(authUser, parsed.data);
  return ok(c, result);
});
