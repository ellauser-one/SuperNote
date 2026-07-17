/**
 * [INPUT]: 依赖 zod、process.env（Bun / mastra 运行时注入）
 * [OUTPUT]: 对外提供 env 只读视图与 Env 类型；缺失必填项当场抛错（fail-fast）
 * [POS]: config 层真相源头；models / agents / routes / middleware 只从此读配置
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 环境变量：
 * - PORT                  HTTP 端口（必填）
 * - ALLOWED_ORIGINS       逗号分隔 CORS 来源（必填）
 * - DEEPSEEK_API_KEY      DeepSeek API Key（必填，仅服务端）
 * - DEFAULT_MODEL         默认模型 id（默认 deepseek/deepseek-chat）
 * - MAX_STEPS             Agent 最大步数（默认 50；必须显式传给 handleChatStream）
 * - MAX_OUTPUT_TOKENS     单次输出 token 上限（默认 393216）
 * - SUPABASE_URL          Supabase 项目 URL（JWT 鉴权必填）
 * - SUPABASE_ANON_KEY     或 SUPABASE_SERVICE_ROLE_KEY：校验用户 JWT 用（二选一）
 * - SUPABASE_SERVICE_ROLE_KEY  会话/消息数据访问（service_role，仅后端）
 * - DATABASE_URL          Mastra Memory 用 PostgreSQL 连接串（可选；缺失则 memory=null 降级）
 */
import { z } from "zod";

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive(),
    ALLOWED_ORIGINS: z.string().min(1),
    DEEPSEEK_API_KEY: z.string().min(1),
    DEFAULT_MODEL: z.string().min(1).default("deepseek/deepseek-chat"),
    MAX_STEPS: z.coerce.number().int().positive().default(50),
    MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(393_216),
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    DATABASE_URL: z.string().min(1).optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.SUPABASE_ANON_KEY && !val.SUPABASE_SERVICE_ROLE_KEY) {
      ctx.addIssue({
        code: "custom",
        message:
          "缺少 SUPABASE_ANON_KEY 或 SUPABASE_SERVICE_ROLE_KEY（JWT 鉴权至少需要一个）",
        path: ["SUPABASE_ANON_KEY"],
      });
    }
  });

const parsed = envSchema.parse(process.env);

export type Env = {
  PORT: number;
  ALLOWED_ORIGINS: string[];
  DEEPSEEK_API_KEY: string;
  DEFAULT_MODEL: string;
  MAX_STEPS: number;
  MAX_OUTPUT_TOKENS: number;
  SUPABASE_URL: string;
  /** Auth REST apikey：优先 anon，否则 service_role */
  SUPABASE_API_KEY: string;
  /** 数据访问 service_role key（会话/消息落库） */
  SUPABASE_SERVICE_ROLE_KEY: string;
  /** Mastra Memory PostgreSQL 连接串（可选；缺失则 memory 降级为 null） */
  DATABASE_URL: string | undefined;
};

export const env: Env = {
  PORT: parsed.PORT,
  ALLOWED_ORIGINS: parsed.ALLOWED_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  DEEPSEEK_API_KEY: parsed.DEEPSEEK_API_KEY,
  DEFAULT_MODEL: parsed.DEFAULT_MODEL,
  MAX_STEPS: parsed.MAX_STEPS,
  MAX_OUTPUT_TOKENS: parsed.MAX_OUTPUT_TOKENS,
  SUPABASE_URL: parsed.SUPABASE_URL.replace(/\/$/, ""),
  SUPABASE_API_KEY:
    parsed.SUPABASE_ANON_KEY ?? parsed.SUPABASE_SERVICE_ROLE_KEY!,
  SUPABASE_SERVICE_ROLE_KEY:
    parsed.SUPABASE_SERVICE_ROLE_KEY ?? parsed.SUPABASE_ANON_KEY!,
  DATABASE_URL: parsed.DATABASE_URL,
};
