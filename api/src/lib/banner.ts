/**
 * [INPUT]: 依赖 lib/ansi；可选读 package.json / CLAUDE.md / env 推断系统名
 * [OUTPUT]: 对外提供 resolveSystemName / printBanner / printRuntimeInfo / printReady
 * [POS]: lib 启动横幅；纯 stdout ASCII，不经业务 logger
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ansi, padVisible } from "./ansi";

const GENERIC_PKG_NAMES = new Set([
  "api",
  "app",
  "server",
  "backend",
  "frontend",
  "web",
  "chat",
  "package",
]);

/**
 * 系统名称解析顺序：
 * 1. APP_NAME / SYSTEM_NAME
 * 2. package.json name（排除 api/app 等通用名）
 * 3. 近邻 CLAUDE.md 标题（# Name - ...）
 */
export function resolveSystemName(): string {
  const fromEnv =
    process.env.APP_NAME?.trim() || process.env.SYSTEM_NAME?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const apiRoot = resolveApiRoot();
  const pkgName = readPackageName(join(apiRoot, "package.json"));
  if (pkgName && !GENERIC_PKG_NAMES.has(pkgName.toLowerCase())) {
    return pkgName;
  }

  for (const md of [
    join(apiRoot, "CLAUDE.md"),
    join(apiRoot, "..", "CLAUDE.md"),
  ]) {
    const title = readClaudeTitle(md);
    if (title) {
      return title;
    }
  }

  // 项目根 CLAUDE 已确认存在「SuperNote」；兜底避免阻塞启动
  return "SuperNote";
}

function resolveApiRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // src/lib -> api/
  return join(here, "..", "..");
}

function readPackageName(path: string): string | null {
  try {
    if (!existsSync(path)) {
      return null;
    }
    const raw = JSON.parse(readFileSync(path, "utf8")) as { name?: string };
    const name = raw.name?.trim();
    return name || null;
  } catch {
    return null;
  }
}

function readClaudeTitle(path: string): string | null {
  try {
    if (!existsSync(path)) {
      return null;
    }
    const first = readFileSync(path, "utf8").split("\n")[0] ?? "";
    // # SuperNote - ...  或  # SuperNote
    const m = /^#\s+(.+?)(?:\s+-\s+.+)?\s*$/.exec(first.trim());
    if (!m?.[1]) {
      return null;
    }
    const title = m[1].trim();
    // 跳过纯路径标题如 "api/"
    if (!title || title.endsWith("/") || title.length < 2) {
      return null;
    }
    return title;
  } catch {
    return null;
  }
}

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

/** 1) 系统名 ASCII logo */
export function printBanner(systemName = resolveSystemName()): void {
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

/** 4) 就绪：endpoint / health / 主路由前缀 */
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

export function supabaseHostFromUrl(url: string): string {
  return safeHost(url);
}

export function detectEnvName(): string {
  return process.env.NODE_ENV?.trim() || "development";
}

export function detectRuntime(): string {
  const bunVer =
    typeof Bun !== "undefined" && Bun.version ? `Bun ${Bun.version}` : "Bun";
  return bunVer;
}
