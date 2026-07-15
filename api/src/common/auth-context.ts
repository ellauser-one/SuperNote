/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 AuthContext 类型（JWT 校验后注入 Hono 上下文）
 * [POS]: common 鉴权上下文契约；middleware / api / service 共用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

/** 已通过 Supabase JWT 校验的请求身份 */
export type AuthContext = {
  /** claims.sub / auth.users.id */
  userId: string;
  email: string | null;
  /** 原始 access_token，供下游 RLS client 或透传审计 */
  accessToken: string;
};

/** Hono Variables 约定 */
export type AuthVariables = {
  auth: AuthContext;
};
