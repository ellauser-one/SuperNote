/**
 * [INPUT]: 依赖 shared/services/supabase client（仅 anon 公钥）
 * [OUTPUT]: 对外提供 handleUnauthorized / setUnauthorizedHandler
 * [POS]: shared/services 全局 401 收敛点；apiFetch 与 chat-transport 共用
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 约定：任何 API/chat 流收到 401 都经此函数统一处理——
 * 注销当前会话并回 landing（/）。无 router 上下文时用 window.location.assign 兜底；
 * AuthProvider 可注册自定义 handler（如 react-router navigate）。
 */
import { supabase } from "./supabase/client";

/** 自定义回登录 handler（AuthProvider 在 router 内注册 navigate 版本） */
let customHandler: (() => void) | null = null;

export function setUnauthorizedHandler(fn: () => void): void {
  customHandler = fn;
}

/** 401 统一处理：注销并回登录页 */
export function handleUnauthorized(): void {
  // 本地会话失效：触发 supabase 注销（无 router 也能执行）
  void supabase.auth.signOut().catch(() => {
    /* 已是无会话态，忽略 */
  });

  if (customHandler) {
    customHandler();
  } else {
    // 兜底：整页回 landing，路由守卫会拦截已注销态
    window.location.assign("/");
  }
}
