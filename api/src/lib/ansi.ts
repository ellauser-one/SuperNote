/**
 * [INPUT]: process.stdout / process.env.NO_COLOR
 * [OUTPUT]: 对外提供 ANSI 色板、visibleLen、padVisible、colorEnabled
 * [POS]: lib 终端呈现工具；banner 专用，业务日志不依赖此模块
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

/** NO_COLOR 或非 TTY 时关闭颜色；Docker logs / 管道仍可读 */
export function colorEnabled(): boolean {
  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== "") {
    return false;
  }
  if (process.env.FORCE_COLOR === "0") {
    return false;
  }
  return Boolean(process.stdout.isTTY);
}

function wrap(code: string): (text: string) => string {
  return (text: string) => {
    if (!colorEnabled()) {
      return text;
    }
    return `\x1b[${code}m${text}\x1b[0m`;
  };
}

export const ansi = {
  bold: wrap("1"),
  dim: wrap("2"),
  red: wrap("31"),
  green: wrap("32"),
  yellow: wrap("33"),
  blue: wrap("34"),
  magenta: wrap("35"),
  cyan: wrap("36"),
  white: wrap("37"),
  reset: colorEnabled() ? "\x1b[0m" : "",
} as const;

/** 去掉 ANSI 后的可见宽度（用于对齐） */
export function visibleLen(text: string): number {
  // eslint-disable-next-line no-control-regex -- strip CSI sequences
  return text.replace(/\x1b\[[0-9;]*m/g, "").length;
}

/** 按可见宽度右补空格 */
export function padVisible(text: string, width: number): string {
  const len = visibleLen(text);
  if (len >= width) {
    return text;
  }
  return text + " ".repeat(width - len);
}
