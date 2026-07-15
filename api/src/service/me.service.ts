/**
 * [INPUT]: 依赖 profile.service / repository
 * [OUTPUT]: 对外提供 GET /v1/me 聚合视图
 * [POS]: service 层；身份只来自 JWT Actor
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { User } from "../model/user.model";
import { findProfileById } from "../repository/profile.repository";
import type { Actor } from "./profile.service";

export type MeView = {
  userId: string;
  email: string | null;
  profile: {
    id: string;
    email: string | null;
    username: string | null;
    displayName: string | null;
  } | null;
};

export async function getMe(actor: Actor): Promise<MeView> {
  let profile: User | null = null;
  try {
    profile = await findProfileById(actor.userId);
  } catch {
    // profiles 暂不可用时仍返回 JWT 身份
    profile = null;
  }

  return {
    userId: actor.userId,
    email: actor.email,
    profile: profile
      ? {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          displayName: profile.displayName,
        }
      : null,
  };
}
