/**
 * [INPUT]: 无外部依赖（纯字符串变换）
 * [OUTPUT]: 对外提供 inflateMarkdownBlankLines · deflateEditorBlankLineMarkers
 * [POS]: widgets MDX 编辑器适配层；Markdown(存储) ↔ WYSIWYG(显示) 的唯一转换点
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 边界纪律：
 * - 数据库 / 后端 / store / 业务页面只见干净 content_mdx
 * - 本模块的 UI 标记（ZWSP / NBSP / 文档哨兵）禁止流出到保存路径
 * - 禁止对正文 .trim()，禁止压缩连续换行
 *
 * 问题本质：mdast 不保留「多个空段落」与行首/行尾空格。
 * 策略：加载前 inflate，onChange/保存前 deflate。
 */

/** 空行锚点：编辑器可渲染的「空段落」占位，deflate 后必须消失 */
const BLANK_LINE_MARKER = "\u200B"; // ZERO WIDTH SPACE

/** 行首/行尾空格保护：mdast 会剥普通空格，NBSP 可存活 */
const SPACE_PROTECT = "\u00A0"; // NO-BREAK SPACE

/**
 * 文档首尾哨兵：对抗 @mdxeditor/editor 导出路径上的 String.trim()。
 * Word Joiner 不属于 trim 空白集，且 deflate 时剥离。
 */
const DOC_SENTINEL = "\u2060"; // WORD JOINER

/**
 * 存储层 markdown → 编辑器显示层 markdown。
 * - 空行 → 零宽字符行（预留视觉高度，避免 AST 折叠）
 * - 行首/行尾空格 → NBSP（避免 mdast 剥离）
 * - 文首文尾加哨兵（避免编辑器 .trim() 吃掉边缘空白）
 */
export function inflateMarkdownBlankLines(databaseValue: string): string {
  const body = databaseValue.split("\n").map(protectLineForEditor).join("\n");
  return `${DOC_SENTINEL}${body}${DOC_SENTINEL}`;
}

/**
 * 编辑器 markdown → 存储层干净 markdown。
 * 去掉全部 UI 标记；不 trim 正文；不压缩连续换行。
 */
export function deflateEditorBlankLineMarkers(editorValue: string): string {
  let s = editorValue;

  // 1) 文档哨兵（首尾或残留）
  if (s.startsWith(DOC_SENTINEL)) {
    s = s.slice(DOC_SENTINEL.length);
  }
  if (s.endsWith(DOC_SENTINEL)) {
    s = s.slice(0, -DOC_SENTINEL.length);
  }
  if (s.includes(DOC_SENTINEL)) {
    s = s.split(DOC_SENTINEL).join("");
  }

  // 2) NBSP → 普通空格（还原行首/行尾/整行空白）
  if (s.includes(SPACE_PROTECT)) {
    s = s.split(SPACE_PROTECT).join(" ");
  }

  // 3) 段落形态的空 ZWSP 段（用户编辑后可能变成 \n\n​\n\n）
  //    每个「​ 独立段」对应存储里的一个空行 → 折成单个 \n
  if (s.includes(BLANK_LINE_MARKER)) {
    s = s.replace(/\n\n\u200B/g, "\n");
    s = s.replace(/^\u200B\n\n/, "\n");
    s = s.replace(/\n\n\u200B$/, "\n");
    s = s.replace(/^\u200B\n/, "\n");
    s = s.replace(/\n\u200B$/, "\n");
  }

  // 4) 软换行形态：整行只有 ZWSP → 空行；其余位置的 ZWSP 清掉
  if (s.includes(BLANK_LINE_MARKER)) {
    s = s
      .split("\n")
      .map((line) => {
        if (line === BLANK_LINE_MARKER) return "";
        if (/^\u200B+$/.test(line)) return "";
        return line.split(BLANK_LINE_MARKER).join("");
      })
      .join("\n");
  }

  return s;
}

/** 单行：空行打标；保护行首/行尾空格；行中连续空格原样保留 */
function protectLineForEditor(line: string): string {
  if (line.length === 0) {
    return BLANK_LINE_MARKER;
  }

  let lead = 0;
  while (lead < line.length && line[lead] === " ") {
    lead += 1;
  }

  let trail = line.length;
  while (trail > lead && line[trail - 1] === " ") {
    trail -= 1;
  }

  const middle = line.slice(lead, trail);

  // 整行皆空格
  if (middle.length === 0) {
    return SPACE_PROTECT.repeat(line.length) || BLANK_LINE_MARKER;
  }

  return (
    SPACE_PROTECT.repeat(lead) + middle + SPACE_PROTECT.repeat(line.length - trail)
  );
}

/** 测试 / 调试用：标记字符（勿在业务层依赖） */
export const __mdxWhitespaceAdapterMarkers = {
  BLANK_LINE_MARKER,
  SPACE_PROTECT,
  DOC_SENTINEL,
} as const;
