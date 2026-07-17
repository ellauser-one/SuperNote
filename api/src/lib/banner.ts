/**
 * [INPUT]: 依赖 lib/ansi、config/env
 * [OUTPUT]: 对外提供 printBanner / printRuntimeInfo / printReady
 * [POS]: lib 启动横幅；纯 stdout ASCII，不经业务 logger
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 三段横幅：
 * 1. printBanner      - ASCII logo + 系统名
 * 2. printRuntimeInfo - env / runtime / port / supabase host / cors
 * 3. printReady       - endpoint / health / 主路由
 *
 * 纯 7-bit ASCII，无 box-drawing 字符。支持 NO_COLOR=1。
 */
import { env } from "../config/env";
import { ansi, padVisible } from "./ansi";

/** 7-bit ASCII 字标（无 unicode box-drawing） */
function asciiLogo(name: string): string[] {
  const key = name.replace(/\s+/g, "").toLowerCase();
  if (key === "supernote") {
    return [
      "  ____                       _   _       _",
      " / ___| _   _ _ __   ___ _ _| \\ | | ___ | |_ ___",
      " \\___ \\| | | | '_ \\ / _ \\ '_|  \\| |/ _ \\| __/ _ \\",
      "  ___) | |_| | |_) |  __/ | | |\\  | (_) | ||  __/",
      " |____/ \\__,_| .__/ \\___|_| |_| \\_|\\___/ \\__\\___|",
      "             |_|",
    ];
  }

  // 通用：双线框式标题（仅 - | + 空格）
  const label = name.toUpperCase();
  const inner = `  ${label}  `;
  const bar = "-".repeat(inner.length);
  return [`+${bar}+`, `|${inner}|`, `+${bar}+`];
}

export type RuntimeInfo = {
  systemName: string;
  envName: string;
  runtime: string;
  port: number;
  supabaseHost: string;
  corsOrigins: string[];
};

export type ReadyInfo = {
  baseUrl: string;
  healthPath: string;
  mainRoutes: string[];
};

function line(label: string, value: string): string {
  return `  ${ansi.dim(padVisible(label, 14))} ${value}`;
}

function safeHost(url: string): string {
  if (!url) {
    return ansi.yellow("(not set)");
  }
  try {
    return new URL(url).host;
  } catch {
    return ansi.yellow("(invalid SUPABASE_URL)");
  }
}

function detectRuntime(): string {
  const bunVer =
    typeof Bun !== "undefined" && Bun.version ? `Bun ${Bun.version}` : "Bun";
  return bunVer;
}

/** 1) 系统名 ASCII logo */
export function printBanner(systemName: string): void {
  const logo = asciiLogo(systemName);
  const out = process.stdout;
  out.write("\n");
  for (const row of logo) {
    out.write(ansi.cyan(row) + "\n");
  }
  out.write(
    ansi.dim(`  ${systemName} API  ·  Bun + Hono + Supabase REST`) + "\n\n",
  );
}

/** 2) 运行时信息（无密钥） */
export function printRuntimeInfo(info: RuntimeInfo): void {
  const out = process.stdout;
  out.write(ansi.bold("  Runtime") + "\n");
  out.write(line("system", info.systemName) + "\n");
  out.write(line("env", info.envName) + "\n");
  out.write(line("runtime", info.runtime) + "\n");
  out.write(line("port", String(info.port)) + "\n");
  out.write(line("supabase", info.supabaseHost) + "\n");
  out.write(
    line(
      "cors",
      info.corsOrigins.length ? info.corsOrigins.join(", ") : "(none)",
    ) + "\n",
  );
  out.write("\n");
}

/** 3) 就绪：endpoint / health / 主路由前缀 */
export function printReady(info: ReadyInfo): void {
  const out = process.stdout;
  out.write(ansi.bold(ansi.green("  Ready")) + "\n");
  out.write(line("endpoint", info.baseUrl) + "\n");
  out.write(line("health", `${info.baseUrl}${info.healthPath}`) + "\n");
  for (const route of info.mainRoutes) {
    out.write(line("route", `${info.baseUrl}${route}`) + "\n");
  }
  out.write("\n");
}

/** 从 env 构造 RuntimeInfo（index.ts 调用） */
export function runtimeInfoFromEnv(): RuntimeInfo {
  return {
    systemName: env.systemName,
    envName: env.nodeEnv,
    runtime: detectRuntime(),
    port: env.port,
    supabaseHost: safeHost(env.supabaseUrl),
    corsOrigins: env.corsOrigins,
  };
}
