/**
 * [INPUT]: 依赖 Hono、requireAuth、dto/profile、service/profile
 * [OUTPUT]: 对外提供 /v1/profiles/*（me 读改、username 可用性）
 * [POS]: api HTTP 层；只挂路径、校验 DTO、调 service、返回信封
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Hono } from "hono";

import type { AuthVariables } from "../common/auth-context";
import { fail, ok } from "../common/response";
import {
  updateProfileBodySchema,
  upsertProfileBodySchema,
  usernameAvailableQuerySchema,
} from "../dto/profile.dto";
import { requireAuth } from "../middleware/auth";
import { ApiCode } from "../model/response.model";
import {
  getMyProfile,
  isUsernameAvailable,
  updateMyProfile,
  upsertMyProfile,
} from "../service/profile.service";

export const profilesApi = new Hono<{ Variables: AuthVariables }>();

profilesApi.use("*", requireAuth);

/** GET /v1/profiles/me */
profilesApi.get("/me", async (c) => {
  const auth = c.get("auth");
  const profile = await getMyProfile({
    userId: auth.userId,
    email: auth.email,
  });

  if (!profile) {
    return fail(c, ApiCode.NOT_FOUND, "Profile not found", 404);
  }

  return ok(c, profile);
});

/** PATCH /v1/profiles/me */
profilesApi.patch("/me", async (c) => {
  const auth = c.get("auth");
  const raw = await c.req.json().catch(() => null);
  const parsed = updateProfileBodySchema.safeParse(raw);

  if (!parsed.success) {
    return fail(
      c,
      ApiCode.BAD_REQUEST,
      parsed.error.issues[0]?.message ?? "Invalid body",
      400,
    );
  }

  const profile = await updateMyProfile(
    { userId: auth.userId, email: auth.email },
    parsed.data,
  );
  return ok(c, profile);
});

/** PUT /v1/profiles/me — upsert；id/email 仅来自 JWT */
profilesApi.put("/me", async (c) => {
  const auth = c.get("auth");
  const raw = await c.req.json().catch(() => ({}));
  const parsed = upsertProfileBodySchema.safeParse(raw);

  if (!parsed.success) {
    return fail(
      c,
      ApiCode.BAD_REQUEST,
      parsed.error.issues[0]?.message ?? "Invalid body",
      400,
    );
  }

  const profile = await upsertMyProfile(
    { userId: auth.userId, email: auth.email },
    parsed.data,
  );
  return ok(c, profile);
});

/** GET /v1/profiles/username-available?username= */
profilesApi.get("/username-available", async (c) => {
  const auth = c.get("auth");
  const parsed = usernameAvailableQuerySchema.safeParse({
    username: c.req.query("username"),
  });

  if (!parsed.success) {
    return fail(
      c,
      ApiCode.BAD_REQUEST,
      parsed.error.issues[0]?.message ?? "Invalid username query",
      400,
    );
  }

  const result = await isUsernameAvailable(
    { userId: auth.userId, email: auth.email },
    parsed.data.username,
  );
  return ok(c, result);
});
