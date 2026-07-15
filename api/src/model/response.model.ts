/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 ApiResponse 信封类型与 ApiCode 常量
 * [POS]: model 层响应信封唯一真相源；common/response 与 route 只消费这些类型
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 约定（本项目）：
 * - 成功 code = 0（非 HTTP 200、非字符串 'ok'）
 * - 失败 code 对齐常见 HTTP status（400/401/…）
 * - 禁止在 route/service 手写临时 { code, message, data }
 */

/** 成功码：固定 0 */
export type ApiOkCode = 0;

/**
 * 业务错误码（数字）。
 * 成功用 0；失败通常与 HTTP status 对齐，便于路由映射。
 */
export type ApiErrorCode = number;

export type ApiCodeValue = ApiOkCode | ApiErrorCode;

/** 成功信封 */
export interface ApiSuccessResponse<T> {
  code: ApiOkCode;
  message: string;
  data: T;
}

/** 失败信封：data 固定 null */
export interface ApiErrorResponse {
  code: ApiErrorCode;
  message: string;
  data: null;
}

/** 统一响应联合类型 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/** 通用业务错误码常量 */
export const ApiCode = {
  OK: 0 as ApiOkCode,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL: 500,
  BAD_GATEWAY: 502,
} as const;

export type ApiCodeName = keyof typeof ApiCode;
