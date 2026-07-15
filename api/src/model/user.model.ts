/**
 * [INPUT]: 对齐 public.profiles 列（create_profiles + display_name）
 * [OUTPUT]: 对外提供 User 领域类型、DB 行类型与映射函数
 * [POS]: model 层用户领域边界；repository 落库，service/dto 消费 camelCase 领域对象
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * Schema:
 * - id uuid PK → auth.users(id) ON DELETE CASCADE
 * - email text null
 * - username text null（3–24 [A-Za-z0-9_]；lower(username) 唯一）
 * - display_name text null
 * - created_at / updated_at timestamptz default now()
 * - RLS: authenticated 仅读写本人行；api 用 service_role 时必须在 service 层做归属校验
 */

/** auth.users.id / profiles.id（uuid 字符串） */
export type UserId = string;

/**
 * 用户领域对象（camelCase）。
 */
export type User = {
  id: UserId;
  email: string | null;
  username: string | null;
  displayName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

/** public.profiles 行形状（snake_case，PostgREST 原样） */
export type ProfileRow = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/** 注册/同步时写入 profiles 的最小载荷（id 必须来自 JWT，不可来自 body） */
export type ProfileInsert = {
  id: UserId;
  email: string | null;
  username: string | null;
  display_name?: string | null;
};

/** 部分更新 profiles 时允许的字段（不含 id） */
export type ProfileUpdate = {
  email?: string | null;
  username?: string | null;
  display_name?: string | null;
};

/** PostgREST / 仓储表名常量 */
export const PROFILES_TABLE = "profiles" as const;

/** repository select 列 */
export const PROFILE_SELECT =
  "id,email,username,display_name,created_at,updated_at" as const;

export function userFromProfileRow(row: ProfileRow): User {
  return {
    id: row.id,
    email: row.email ?? null,
    username: row.username ?? null,
    displayName: row.display_name ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}
