/**
 * [INPUT]: 依赖 @supabase/supabase-js 与 Vite 公开环境变量
 * [OUTPUT]: 对外提供浏览器端单例 supabase client 与配置探测
 * [POS]: shared/services/supabase 的浏览器鉴权/数据客户端；仅使用 anon/publishable 公钥
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
/** Prefer anon key per product contract; publishable key remains legacy-compatible. */
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "";

/** True when public browser env is present (URL + anon/publishable key). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Browser SPA client — singleton for the whole app tab.
 * - persistSession / autoRefreshToken / detectSessionInUrl enabled when configured
 * - Never import or ship service_role here
 * - When env is missing, a placeholder client still constructs so the module loads;
 *   call sites must gate on `isSupabaseConfigured` before auth flows
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: isSupabaseConfigured
      ? {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        }
      : {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          flowType: "pkce",
        },
  },
);

export function getSupabaseConfigError(): string | null {
  if (isSupabaseConfigured) {
    return null;
  }

  return "未配置 Supabase。请复制 app/.env.example 为 app/.env.local，并填入 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。";
}
