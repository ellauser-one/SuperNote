/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 TrustedUserContext（api 已验 JWT 后下发的用户身份）
 * [POS]: common 契约；middleware 注入，routes/services 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

/** 受信用户上下文 — 由 api 校验 JWT 后通过内部头传入，chat 不再验用户 JWT */
export type TrustedUserContext = {
  userId: string;
  email: string | null;
};

export type UserContextVariables = {
  user: TrustedUserContext;
};
