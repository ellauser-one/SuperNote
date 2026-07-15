/**
 * [INPUT]: 依赖 process.env（Bun 运行时注入）
 * [OUTPUT]: 对外提供 api 服务运行时环境变量只读视图
 * [POS]: config 层真相源头；lib/repository/middleware 从此读取连接与密钥
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export type ApiEnv = {
  port: number;
  /**
   * 系统展示名（启动横幅）。
   * 优先 APP_NAME / SYSTEM_NAME；未设时由 banner 从 CLAUDE.md 等推断。
   */
  appName: string;
  /** Supabase project URL，例如 https://xxx.supabase.co */
  supabaseUrl: string;
  /**
   * 服务端密钥（service_role）。仅 api 进程使用，禁止下发浏览器。
   * 未配置时 REST client / JWT 校验会拒绝初始化。
   */
  supabaseServiceRoleKey: string;
  /** chat 服务基址，api → chat 转发 AI 请求 */
  chatUrl: string;
  /**
   * api ↔ chat 共享服务令牌。
   * chat 只认此令牌 + X-User-Id，不直接验用户 JWT。
   */
  internalServiceToken: string;
  /** 浏览器 CORS 来源（逗号分隔） */
  corsOrigins: string[];
};

function read(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function readPort(name: string, fallback: number): number {
  const raw = read(name);
  if (!raw) {
    return fallback;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const corsRaw = read("CORS_ORIGINS") || read("CORS_ORIGIN") || "http://localhost:10001";

export const env: ApiEnv = {
  port: readPort("PORT", 10002),
  appName: read("APP_NAME") || read("SYSTEM_NAME"),
  supabaseUrl: read("SUPABASE_URL"),
  supabaseServiceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),
  chatUrl: (read("CHAT_URL") || "http://localhost:10003").replace(/\/$/, ""),
  internalServiceToken: read("INTERNAL_SERVICE_TOKEN"),
  corsOrigins: corsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

export function assertSupabaseAdminEnv(): void {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error(
      "缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY。请在 api/.env 中配置后重启服务。",
    );
  }
}

export function assertInternalServiceToken(): void {
  if (!env.internalServiceToken) {
    throw new Error(
      "缺少 INTERNAL_SERVICE_TOKEN。api → chat 需要共享服务令牌，请在 api/.env 与 chat/.env 配置相同值。",
    );
  }
}
