/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 ApiSuccessResponse / ApiErrorResponse / ApiResponse 信封类型
 * [POS]: model 层响应信封唯一真相源；common/response 与 router 只消费这些类型
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 约定（本项目）：
 * - 成功 code = "ok"（字符串字面量）
 * - 失败 code = 大写字符串（如 "UNAUTHORIZED"、"SUPABASE_REST_ERROR"）
 * - 禁止在 router/service 手写临时 { code, message, data }
 */

/** 成功码：固定 "ok" */
export type ApiOkCode = "ok";

/** 业务错误码：大写字符串 */
export type ApiErrorCode = string;

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
