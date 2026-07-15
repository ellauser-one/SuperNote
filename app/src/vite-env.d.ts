/**
 * [INPUT]: 依赖 Vite client 类型
 * [OUTPUT]: 声明 import.meta.env 的用户端公开环境变量
 * [POS]: app/src 的 Vite 环境类型补充
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  /** Browser public anon key (preferred). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Optional legacy alias when ANON_KEY is unset. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Business API base URL (Bearer access_token). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
