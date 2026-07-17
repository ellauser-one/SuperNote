/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 HttpError（service/repository 可抛出的结构化错误）
 * [POS]: common 错误类型；error-handler 中间件映射为 ApiResponse 信封
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 用法：
 *   throw new HttpError(401, "UNAUTHORIZED", "未登录");
 *   throw new HttpError(502, "SUPABASE_REST_ERROR", "Supabase 返回 500");
 */

/** service / repository 可抛出；不携带 token 或敏感 header */
export class HttpError extends Error {
  readonly httpStatus: number;
  readonly code: string;

  constructor(httpStatus: number, code: string, message: string) {
    super(message);
    this.name = "HttpError";
    this.httpStatus = httpStatus;
    this.code = code;
  }
}
