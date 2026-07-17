/**
 * [INPUT]: 依赖 Hono、dto/profile、service/profile、lib/supabase-auth、common/response
 * [OUTPUT]: 对外提供 profileRouter（GET /profile · PATCH /profile）
 * [POS]: router 层；读请求、zod 校验、调 service、返回信封；禁止业务判断
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Hono } from "hono";

import { HttpError } from "../common/app-error";
import { fail, ok } from "../common/response";
import {
  FORBIDDEN_PROFILE_ID_KEYS,
  patchProfileBodySchema,
} from "../dto/profile.dto";
import {
  extractBearerToken,
  fetchAuthUser,
} from "../lib/supabase-auth";
import * as profileService from "../service/profile.service";

export const profileRouter = new Hono();

/** GET /profile — get-or-create 当前用户 profile */
profileRouter.get("/profile", async (c) => {
  const token = extractBearerToken(c.req.header("Authorization"));
  const authUser = await fetchAuthUser(token);
  const profile = await profileService.getOrCreateProfile(authUser);
  return ok(c, profile);
});

/** PATCH /profile — 更新允许的资料字段 */
profileRouter.patch("/profile", async (c) => {
  const token = extractBearerToken(c.req.header("Authorization"));
  const authUser = await fetchAuthUser(token);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return fail(c, "VALIDATION_ERROR", "请求体必须是 JSON", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail(c, "VALIDATION_ERROR", "请求体必须是 JSON 对象", 400);
  }

  const rec = body as Record<string, unknown>;

  // 身份字段只能来自 JWT
  for (const key of FORBIDDEN_PROFILE_ID_KEYS) {
    if (Object.prototype.hasOwnProperty.call(rec, key)) {
      return fail(
        c,
        "VALIDATION_ERROR",
        `不允许在 body 中传入 ${key}`,
        400,
      );
    }
  }

  const parsed = patchProfileBodySchema.safeParse(body);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ?? "请求体校验失败";
    return fail(c, "VALIDATION_ERROR", msg, 400);
  }

  try {
    const profile = await profileService.updateProfile(
      authUser,
      parsed.data,
    );
    return ok(c, profile);
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
    throw err;
  }
});
