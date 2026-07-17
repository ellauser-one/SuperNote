/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 Profile / AuthUser / ProfileUpdate 领域类型
 * [POS]: model 层 profiles 领域形状；dto/repository/service 共享
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

/** Supabase Auth /auth/v1/user 可信用户（仅服务端解析 JWT 后） */
export type AuthUser = {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
};

/** public.profiles 行形状（与 api/supabase/profiles.sql 对齐） */
export type Profile = {
  id: string;
  email: string | null;
  nickname: string;
  username: string | null;
  avatar_url: string | null;
  age: number | null;
  bio: string | null;
  headline: string | null;
  location: string | null;
  website_url: string | null;
  company: string | null;
  role: string | null;
  honor_title: string | null;
  reputation_score: number | null;
  badges: unknown;
  social_links: unknown;
  metadata: unknown;
  created_at: string | null;
  updated_at: string | null;
};

/** 服务层可写入的资料字段（不含 id / 系统字段） */
export type ProfileUpdate = {
  nickname?: string;
  username?: string | null;
  avatar_url?: string | null;
  age?: number | null;
  bio?: string | null;
  headline?: string | null;
  location?: string | null;
  website_url?: string | null;
  company?: string | null;
  role?: string | null;
  honor_title?: string | null;
  social_links?: Record<string, unknown> | null;
  badges?: unknown;
  metadata?: Record<string, unknown> | null;
};
