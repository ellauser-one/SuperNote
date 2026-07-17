/**
 * [INPUT]: 依赖 model/response.model；Hono Context
 * [OUTPUT]: 对外提供 ok / fail（信封构造 + c.json 快捷返回）
 * [POS]: common 响应 helper；禁止 router 手写 { code, message, data }
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 用法：
 *   return ok(c, { status: "healthy" });
 *   return fail(c, "UNAUTHORIZED", "未登录", 401);
 */
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from "../model/response.model";

/** 纯成功信封（无 Hono 依赖，供测试或非 HTTP 层复用） */
export function okBody<T>(
  data: T,
  message = "ok",
): ApiSuccessResponse<T> {
  return {
    code: "ok",
    message,
    data,
  };
}

/** 纯失败信封 */
export function failBody(
  code: string,
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
 * status 必须显式传入（对齐 HTTP 语义）。
 */
export function fail(
  c: Context,
  code: string,
  message: string,
  status: ContentfulStatusCode,
) {
  return c.json(failBody(code, message), status);
}
