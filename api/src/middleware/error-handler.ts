/**
 * [INPUT]: 依赖 Hono Context、common/app-error（HttpError）、common/response（fail）
 * [OUTPUT]: 对外提供 errorHandler（Hono onError 回调）
 * [POS]: middleware 错误处理；将 HttpError / 未知错误映射为统一信封
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 映射规则：
 * - HttpError → fail(c, err.code, err.message, err.httpStatus)
 * - 未知 Error → fail(c, "INTERNAL_ERROR", "Internal Server Error", 500)
 * - 安全：错误日志不打印 token / Authorization / stack 到响应体
 */
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { HttpError } from "../common/app-error";
import { fail } from "../common/response";

export function errorHandler(err: Error, c: Context) {
  if (err instanceof HttpError) {
    console.error("[error]", err.code, err.message);
    return fail(c, err.code, err.message, err.httpStatus as ContentfulStatusCode);
  }

  console.error("[error]", err instanceof Error ? err.message : "unknown error");
  return fail(c, "INTERNAL_ERROR", "Internal Server Error", 500);
}
