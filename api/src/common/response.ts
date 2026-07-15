/**
 * [INPUT]: 依赖 model/response.model；可选 Hono Context
 * [OUTPUT]: 对外提供 ok / fail（信封构造 + c.json 快捷返回）
 * [POS]: common 响应 helper；禁止 route 手写 { code, message, data }
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import {
  ApiCode,
  type ApiErrorCode,
  type ApiErrorResponse,
  type ApiSuccessResponse,
} from "../model/response.model";

/** 纯成功信封（无 Hono 依赖，供测试或非 HTTP 层复用） */
export function okBody<T>(
  data: T,
  message = "ok",
): ApiSuccessResponse<T> {
  return {
    code: ApiCode.OK,
    message,
    data,
  };
}

/** 纯失败信封 */
export function failBody(
  code: ApiErrorCode,
  message: string,
): ApiErrorResponse {
  return {
    code,
    message,
    data: null,
  };
}

/**
 * 成功响应：写入 JSON 信封。
 * 用法：return ok(c, data)
 */
export function ok<T>(
  c: Context,
  data: T,
  message = "ok",
  status: ContentfulStatusCode = 200,
) {
  return c.json(okBody(data, message), status);
}

/**
 * 失败响应：写入 JSON 信封。
 * status 默认对齐 code（若 code 为合法 HTTP 4xx/5xx），否则 500。
 */
export function fail(
  c: Context,
  code: ApiErrorCode,
  message: string,
  status?: ContentfulStatusCode,
) {
  const httpStatus: ContentfulStatusCode =
    status ??
    (code >= 400 && code < 600 ? (code as ContentfulStatusCode) : 500);
  return c.json(failBody(code, message), httpStatus);
}
