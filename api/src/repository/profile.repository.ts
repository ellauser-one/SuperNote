/**
 * [INPUT]: 依赖 lib/supabase-rest、model/profile.model、common/app-error
 * [OUTPUT]: 对外提供 findProfileById / insertProfile / updateProfileById
 * [POS]: repository 层 profiles CRUD；只走 supabase-rest，无业务权限
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 约定：
 * - service_role 绕过 RLS；归属由 service 层保证（id 仅来自 JWT）
 * - Prefer: return=representation 返回写入后的行
 * - 禁止 supabase-js 客户端 / 连接串
 */
import { HttpError } from "../common/app-error";
import {
  createPostgrestQuery,
  supabaseRest,
} from "../lib/supabase-rest";
import type { Profile, ProfileUpdate } from "../model/profile.model";

const TABLE = "profiles";

/** 全列；与 profiles.sql 对齐，由 PostgREST 返回实际列 */
const PROFILE_SELECT = "*";

/** 按主键查询；无行返回 null */
export async function findProfileById(id: string): Promise<Profile | null> {
  const query = createPostgrestQuery()
    .select(PROFILE_SELECT)
    .eq("id", id)
    .limit(1)
    .build();

  const rows = await supabaseRest<Profile[]>(TABLE, {
    method: "GET",
    query,
  });

  if (!rows || rows.length === 0) {
    return null;
  }

  return rows[0] ?? null;
}

/** 插入完整 profile 行并返回 representation */
export async function insertProfile(
  row: Pick<Profile, "id" | "email" | "nickname" | "username"> &
    Partial<Omit<Profile, "id" | "email" | "nickname" | "username">>,
): Promise<Profile> {
  const created = await supabaseRest<Profile[]>(TABLE, {
    method: "POST",
    body: row,
    returnRepresentation: true,
  });

  const profile = Array.isArray(created) ? created[0] : null;
  if (!profile) {
    throw new HttpError(
      502,
      "SUPABASE_REST_ERROR",
      "创建 profile 后未返回行",
    );
  }

  return profile;
}

/**
 * 按 id 更新允许字段；返回更新后的行。
 * 0 行 → 404（由 service 先 ensure 时不应发生）。
 */
export async function updateProfileById(
  id: string,
  patch: ProfileUpdate,
): Promise<Profile> {
  const query = createPostgrestQuery().eq("id", id).build();
  // Prefer return=representation 由 supabaseRest 选项设置；select 用 query
  const updated = await supabaseRest<Profile[]>(TABLE, {
    method: "PATCH",
    query: {
      ...query,
      select: PROFILE_SELECT,
    },
    body: patch,
    returnRepresentation: true,
  });

  const profile = Array.isArray(updated) ? updated[0] : null;
  if (!profile) {
    throw new HttpError(404, "NOT_FOUND", "profile 不存在");
  }

  return profile;
}
