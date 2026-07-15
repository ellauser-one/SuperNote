/**
 * [INPUT]: 转发 model/response.model
 * [OUTPUT]: 兼容旧 import 路径
 * [POS]: 过渡 re-export；新代码请 import response.model
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export {
  ApiCode,
  type ApiCodeName,
  type ApiCodeValue,
  type ApiErrorCode,
  type ApiErrorResponse,
  type ApiOkCode,
  type ApiResponse,
  type ApiSuccessResponse,
} from "./response.model";
