/**
 * [INPUT]: 转发 common/response
 * [OUTPUT]: 兼容旧 import 路径（okBody/failBody 亦导出）
 * [POS]: 过渡 re-export；新代码请 import common/response
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
export { fail, failBody, ok, okBody } from "./response";
