/**
 * [INPUT]: 依赖 zod、process.env（Bun 运行时注入）
 * [OUTPUT]: 对外提供 env 只读视图与 Env 类型
 * [POS]: config 层真相源头；lib/repository/middleware 从此读取连接与密钥
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 环境变量：
 * - PORT          HTTP 端口（默认 20001）
 * - NODE_ENV      运行环境（默认 development）
 * - SYSTEM_NAME   系统展示名（默认 SuperNote）
 * - CORS_ORIGINS  逗号分隔的 CORS 来源
 * - SUPABASE_URL  Supabase 项目 URL（必填）
 * - SUPABASE_SERVICE_ROLE_KEY  service_role 密钥（必填，仅服务端）
 */
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(20001),
  NODE_ENV: z.string().default("development"),
  SYSTEM_NAME: z.string().default("SuperNote"),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:20000,http://127.0.0.1:20000"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const parsed = envSchema.parse(process.env);

export type Env = {
  port: number;
  nodeEnv: string;
  systemName: string;
  corsOrigins: string[];
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
};

export const env: Env = {
  port: parsed.PORT,
  nodeEnv: parsed.NODE_ENV,
  systemName: parsed.SYSTEM_NAME,
  corsOrigins: parsed.CORS_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  supabaseUrl: parsed.SUPABASE_URL,
  supabaseServiceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY,
};
