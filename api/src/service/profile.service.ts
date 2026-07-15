/**
 * [INPUT]: 依赖 repository/profile、dto 类型、common/app-error
 * [OUTPUT]: 对外提供当前用户 profile 读改与 username 可用性
 * [POS]: service 层业务编排与权限判断；不依赖 Hono Context
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 身份只认 JWT userId；写入路径强制 id = userId，忽略/禁止 body 身份字段。
 */
import { AppError } from "../common/app-error";
import type {
  UpdateProfileBody,
  UpsertProfileBody,
} from "../dto/profile.dto";
import { ApiCode } from "../model/response.model";
import type { User } from "../model/user.model";
import {
  findProfileById,
  findProfileByUsername,
  updateProfile,
  upsertProfile,
} from "../repository/profile.repository";

export type Actor = {
  userId: string;
  email: string | null;
};

/** 读取当前用户 profile；不存在返回 null（由 route 决定 404 或空 data） */
export async function getMyProfile(actor: Actor): Promise<User | null> {
  return findProfileById(actor.userId);
}

/**
 * 更新本人 profile。
 * repository 条件 id=eq.{userId}；再校验返回行归属（防御性）。
 */
export async function updateMyProfile(
  actor: Actor,
  body: UpdateProfileBody,
): Promise<User> {
  if (body.username !== undefined) {
    await assertUsernameAvailable(body.username, actor.userId);
  }

  const patch: {
    username?: string | null;
    display_name?: string | null;
  } = {};

  if (body.username !== undefined) {
    patch.username = body.username;
  }
  if (body.displayName !== undefined) {
    patch.display_name = body.displayName;
  }

  const updated = await updateProfile(actor.userId, patch);
  assertOwned(updated, actor.userId);
  return updated;
}

/**
 * Upsert 本人 profile。
 * id / email 只来自 JWT，body 仅可提供 username / displayName。
 */
export async function upsertMyProfile(
  actor: Actor,
  body: UpsertProfileBody,
): Promise<User> {
  const username =
    body.username === undefined ? null : body.username;

  if (username) {
    await assertUsernameAvailable(username, actor.userId);
  }

  const existing = await findProfileById(actor.userId);

  const saved = await upsertProfile({
    id: actor.userId,
    email: actor.email,
    username:
      body.username !== undefined
        ? body.username
        : (existing?.username ?? null),
    display_name:
      body.displayName !== undefined
        ? body.displayName
        : (existing?.displayName ?? null),
  });

  assertOwned(saved, actor.userId);
  return saved;
}

/**
 * username 是否可用。
 * 已占用但属于本人 → available=true（改名回写自己）。
 */
export async function isUsernameAvailable(
  actor: Actor,
  username: string,
): Promise<{ available: boolean; username: string }> {
  const found = await findProfileByUsername(username);
  if (!found) {
    return { available: true, username };
  }
  return {
    available: found.id === actor.userId,
    username,
  };
}

async function assertUsernameAvailable(
  username: string,
  ownerId: string,
): Promise<void> {
  const found = await findProfileByUsername(username);
  if (found && found.id !== ownerId) {
    throw new AppError(ApiCode.CONFLICT, "Username is already taken", 409);
  }
}

function assertOwned(user: User, userId: string): void {
  if (user.id !== userId) {
    throw new AppError(
      ApiCode.FORBIDDEN,
      "Profile does not belong to the authenticated user",
      403,
    );
  }
}
