/**
 * [INPUT]: bun:test · mdx-whitespace-adapter · mdast-util-from/to-markdown（模拟编辑器 AST 往返）
 * [OUTPUT]: 验收 inflate/deflate 与「经 mdast 往返」后的保真
 * [POS]: widgets 适配层单测；不触及 store/API
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { describe, expect, test } from "bun:test";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";

import {
  __mdxWhitespaceAdapterMarkers as markers,
  deflateEditorBlankLineMarkers,
  inflateMarkdownBlankLines,
} from "./mdx-whitespace-adapter";

/** 模拟 @mdxeditor/editor：mdast 往返 + 导出 trim（库内写死） */
function simulateMdxEditorRoundTrip(databaseValue: string): string {
  const inflated = inflateMarkdownBlankLines(databaseValue);
  const tree = fromMarkdown(inflated);
  const exported = toMarkdown(tree).trim();
  return deflateEditorBlankLineMarkers(exported);
}

const acceptanceCases: { name: string; value: string }[] = [
  { name: "普通文本", value: "plain hello" },
  { name: "空字符串", value: "" },
  { name: "段落间一个空行（标准）", value: "hello\n\nworld" },
  { name: "段落间两个空行", value: "hello\n\n\nworld" },
  { name: "段落间五个空行", value: "hello\n\n\n\n\n\nworld" },
  { name: "行首空格", value: "  indented" },
  { name: "行尾空格", value: "trail   " },
  { name: "行中间连续空格", value: "a   b" },
  { name: "加粗与斜体间多空行", value: "**bold**\n\n\n*italic*" },
  { name: "文末连续空行", value: "para\n\n\n\n" },
  { name: "空白行含空格", value: "line1\n  \nline2" },
  { name: "文首空格+多空行+文尾空格", value: "  lead\n\n\ntrail  " },
  { name: "标题后多空行", value: "# title\n\n\nbody" },
];

describe("mdx-whitespace-adapter", () => {
  test("inflate → deflate 直接可逆（无 AST）", () => {
    for (const { name, value } of acceptanceCases) {
      const out = deflateEditorBlankLineMarkers(
        inflateMarkdownBlankLines(value),
      );
      expect(out, name).toBe(value);
    }
  });

  test("经 mdast 往返 + trim 后仍保真", () => {
    for (const { name, value } of acceptanceCases) {
      const out = simulateMdxEditorRoundTrip(value);
      expect(out, name).toBe(value);
    }
  });

  test("deflate 后不得残留 UI 标记", () => {
    for (const { value } of acceptanceCases) {
      const out = simulateMdxEditorRoundTrip(value);
      expect(out.includes(markers.BLANK_LINE_MARKER)).toBe(false);
      expect(out.includes(markers.SPACE_PROTECT)).toBe(false);
      expect(out.includes(markers.DOC_SENTINEL)).toBe(false);
      expect(out.includes("&nbsp;")).toBe(false);
      expect(out.includes("&#x20;")).toBe(false);
    }
  });

  test("不 trim 正文、不压缩连续换行", () => {
    const withEdges = "  keep edges  ";
    expect(simulateMdxEditorRoundTrip(withEdges)).toBe(withEdges);

    const manyBlank = "a\n\n\n\n\nb";
    expect(simulateMdxEditorRoundTrip(manyBlank)).toBe(manyBlank);
    // 中间空行数量不变
    expect(manyBlank.split("\n").length).toBe(
      simulateMdxEditorRoundTrip(manyBlank).split("\n").length,
    );
  });

  test("inflate 产物含显示层标记（仅编辑器内）", () => {
    const inflated = inflateMarkdownBlankLines("a\n\n\nb");
    expect(inflated.includes(markers.BLANK_LINE_MARKER)).toBe(true);
    expect(inflated.startsWith(markers.DOC_SENTINEL)).toBe(true);
    expect(inflated.endsWith(markers.DOC_SENTINEL)).toBe(true);

    const withIndent = inflateMarkdownBlankLines("  x");
    expect(withIndent.includes(markers.SPACE_PROTECT)).toBe(true);
  });
});
