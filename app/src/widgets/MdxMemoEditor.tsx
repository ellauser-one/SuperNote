/**
 * [INPUT]: 依赖 @mdxeditor/editor、lexical、./mdx-whitespace-adapter；
 *         外观由 index.css .supernote-mdx-editor 控制
 * [OUTPUT]: 对外提供 MdxMemoEditor（props/onChange 永远是干净 content_mdx）
 * [POS]: widgets MDX 编辑适配层 — Markdown 存储协议 ↔ WYSIWYG 显示协议的唯一边界
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * 三层分离：
 * 1. 存储/业务：干净 markdown 字符串（无 ZWSP/NBSP/哨兵）
 * 2. 本组件：inflate 后交给 MDXEditor；onChange 前 deflate
 * 3. 禁止：后端猜空行、DB 存特殊符、页面 trim/replace
 */
import {
  createRootEditorSubscription$,
  headingsPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  MDXEditor,
  quotePlugin,
  realmPlugin,
  thematicBreakPlugin,
  type MDXEditorMethods,
} from "@mdxeditor/editor";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  PASTE_COMMAND,
} from "lexical";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";

import {
  deflateEditorBlankLineMarkers,
  inflateMarkdownBlankLines,
} from "./mdx-whitespace-adapter";

import "@mdxeditor/editor/style.css";
/* Must follow MDX styles so rem spacing on :root cannot enlarge the app */
import "../shared/ui/token-lock.css";

type MdxMemoEditorProps = {
  /** 干净的 content_mdx（存储协议）；组件内会 inflate */
  markdown: string;
  /** 回调参数永远是 deflate 后的干净 markdown */
  onChange: (markdown: string, initialMarkdownNormalize: boolean) => void;
  onBlur?: (e: FocusEvent) => void;
  placeholder?: string;
  readOnly?: boolean;
};

/**
 * 粘贴纯文本时使用 insertText，避免 clipboard HTML 路径压缩空白。
 * 若剪贴板同时含文件（如图片），放行默认处理。
 */
const plainTextPastePlugin = realmPlugin({
  init(realm) {
    realm.pub(createRootEditorSubscription$, (editor) => {
      return editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          if (!(event instanceof ClipboardEvent) || !event.clipboardData) {
            return false;
          }

          const text = event.clipboardData.getData("text/plain");
          if (!text) return false;

          if (event.clipboardData.files && event.clipboardData.files.length > 0) {
            return false;
          }

          event.preventDefault();
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              selection.insertText(text);
            }
          });
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      );
    });
  },
});

export const MdxMemoEditor = forwardRef<MDXEditorMethods, MdxMemoEditorProps>(
  function MdxMemoEditor(
    { markdown, onChange, onBlur, placeholder, readOnly },
    ref,
  ) {
    const innerRef = useRef<MDXEditorMethods>(null);

    const plugins = useMemo(
      () => [
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        plainTextPastePlugin(),
      ],
      [],
    );

    // 仅挂载时读 markdown；用 key 切换备忘录。这里 inflate 供显示层使用。
    const editorMarkdown = useMemo(
      () => inflateMarkdownBlankLines(markdown),
      // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/remount only via parent key
      [markdown],
    );

    const handleChange = useCallback(
      (value: string, initialMarkdownNormalize: boolean) => {
        // 出边界前还原：业务层永远只见干净 markdown
        onChange(deflateEditorBlankLineMarkers(value), initialMarkdownNormalize);
      },
      [onChange],
    );

    useImperativeHandle(
      ref,
      () => ({
        getMarkdown: () =>
          deflateEditorBlankLineMarkers(innerRef.current?.getMarkdown() ?? ""),
        setMarkdown: (value: string) => {
          innerRef.current?.setMarkdown(inflateMarkdownBlankLines(value));
        },
        insertMarkdown: (value: string) => {
          // 插入片段不 inflate 整篇；按干净 markdown 片段交给编辑器
          innerRef.current?.insertMarkdown(value);
        },
        focus: (callbackFn, opts) => {
          innerRef.current?.focus(callbackFn, opts);
        },
        getContentEditableHTML: () =>
          innerRef.current?.getContentEditableHTML() ?? "",
        getSelectionMarkdown: () =>
          deflateEditorBlankLineMarkers(
            innerRef.current?.getSelectionMarkdown() ?? "",
          ),
      }),
      [],
    );

    return (
      <MDXEditor
        ref={innerRef}
        className="supernote-mdx-editor h-full"
        contentEditableClassName="supernote-mdx-editor__content min-h-full outline-none"
        markdown={editorMarkdown}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        readOnly={readOnly}
        trim={false}
        plugins={plugins}
        toMarkdownOptions={{
          emphasis: "*",
          strong: "*",
          bullet: "-",
          fence: "`",
          fences: true,
          resourceLink: true,
          rule: "-",
        }}
      />
    );
  },
);
