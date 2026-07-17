/**
 * [INPUT]: 依赖 repository/profile、model/profile、common/app-error
 * [OUTPUT]: 对外提供 getOrCreateProfile / updateProfile
 * [POS]: service 层 profile 编排与归属校验；不依赖 Hono Context
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 安全：
 * - user id 只能来自 AuthUser（JWT），禁止 body
 * - service_role 绕过 RLS，本层必须强制 id = authUser.id
 * - 日志不打印 Authorization / token
 */
import { HttpError } from "../common/app-error";
import type {
  AuthUser,
  Profile,
  ProfileUpdate,
} from "../model/profile.model";
import * as profileRepo from "../repository/profile.repository";

/**
 * GET /profile：查询；不存在则创建默认 profile。
 */
export async function getOrCreateProfile(
  authUser: AuthUser,
): Promise<Profile> {
  const existing = await profileRepo.findProfileById(authUser.id);
  if (existing) {
    // 归属双检（service_role 绕过 RLS）
    assertOwnership(existing.id, authUser.id);
    return existing;
  }

  const defaults = buildDefaultProfile(authUser);

  try {
    const created = await profileRepo.insertProfile(defaults);
    assertOwnership(created.id, authUser.id);
    return created;
  } catch (err) {
    // 并发首次访问：唯一主键冲突时回读
    if (isUniqueViolation(err)) {
      const raced = await profileRepo.findProfileById(authUser.id);
      if (raced) {
        assertOwnership(raced.id, authUser.id);
        return raced;
      }
    }
    throw err;
  }
}

/**
 * PATCH /profile：先 ensure 存在，再按 JWT id 更新。
 */
export async function updateProfile(
  authUser: AuthUser,
  patch: ProfileUpdate,
): Promise<Profile> {
  // 确保行存在（并完成归属）
  await getOrCreateProfile(authUser);

  if (Object.keys(patch).length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "请求体无有效更新字段");
  }

  const updated = await profileRepo.updateProfileById(authUser.id, patch);
  assertOwnership(updated.id, authUser.id);
  return updated;
}

// ---------------------------------------------------------------------------
// 内部
// ---------------------------------------------------------------------------

function assertOwnership(rowId: string, authUserId: string): void {
  if (rowId !== authUserId) {
    // 理论上 service_role + eq(id) 不会走到；防御 BOLA
    throw new HttpError(403, "FORBIDDEN", "无权访问该 profile");
  }
}

/**
 * 默认 nickname：user_metadata 昵称/姓名 → 邮箱前缀 → "user"
 * 默认 username：supernote_${id 去横线前 6 位}
 */
function buildDefaultProfile(
  authUser: AuthUser,
): Pick<Profile, "id" | "email" | "nickname" | "username"> {
  const meta = authUser.user_metadata ?? {};
  const metaNickname = firstNonEmptyString(
    meta.nickname,
    meta.full_name,
    meta.name,
    meta.preferred_username,
    meta.username,
  );

  const email = authUser.email ?? null;
  const emailPrefix =
    email && email.includes("@")
      ? email.split("@")[0]?.trim() || null
      : null;

  const nickname = metaNickname || emailPrefix || "user";
  const username = `supernote_${authUser.id.replace(/-/g, "").slice(0, 6)}`;

  return {
    id: authUser.id,
    email,
    nickname,
    username,
  };
}

function firstNonEmptyString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string") {
      const t = v.trim();
      if (t) return t;
    }
  }
  return null;
}

function isUniqueViolation(err: unknown): boolean {
  if (!(err instanceof HttpError)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("duplicate") ||
    msg.includes("unique") ||
    msg.includes("23505")
  );
}
