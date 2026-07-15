/**
 * [INPUT]: 依赖 process.env（Bun 运行时注入）
 * [OUTPUT]: 对外提供 chat 服务运行时环境变量只读视图
 * [POS]: config 层真相源头；middleware 用 internalServiceToken 校验来源
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export type ChatEnv = {
  port: number;
  /**
   * 仅 api（或其他受信服务）持有。
   * 与 api INTERNAL_SERVICE_TOKEN 必须一致。
   */
  internalServiceToken: string;
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

export const env: ChatEnv = {
  port: readPort("PORT", 10003),
  internalServiceToken: read("INTERNAL_SERVICE_TOKEN"),
};

export function assertInternalServiceToken(): void {
  if (!env.internalServiceToken) {
    throw new Error(
      "缺少 INTERNAL_SERVICE_TOKEN。chat 只接受持有此令牌的受信服务（api）。",
    );
  }
}
