/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 AppError（service 层可抛出的结构化业务错误）
 * [POS]: common 错误类型；index onError 映射为 ApiResponse 信封
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

/** service / repository 可抛出；不携带 token 或敏感 header */
export class AppError extends Error {
  readonly code: number;
  readonly httpStatus: number;

  constructor(code: number, message: string, httpStatus?: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus =
      httpStatus ?? (code >= 400 && code < 600 ? code : 500);
  }
}
