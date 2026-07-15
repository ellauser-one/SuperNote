/**
 * [INPUT]: 依赖 @mdxeditor/editor 插件；外观由 index.css .supernote-mdx-editor 控制
 * [OUTPUT]: 对外提供 MdxMemoEditor
 * [POS]: widgets MDX 编辑适配层；不硬编码颜色与字号
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import {
  headingsPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  MDXEditor,
  quotePlugin,
  thematicBreakPlugin,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
/* Must follow MDX styles so rem spacing on :root cannot enlarge the app */
import "../shared/ui/token-lock.css";

type MdxMemoEditorProps = {
  markdown: string;
  onChange: (markdown: string) => void;
};

const editorPlugins = [
  headingsPlugin(),
  listsPlugin(),
  quotePlugin(),
  thematicBreakPlugin(),
  markdownShortcutPlugin(),
];

export function MdxMemoEditor({ markdown, onChange }: MdxMemoEditorProps) {
  return (
    <MDXEditor
      className="supernote-mdx-editor h-full"
      contentEditableClassName="min-h-full outline-none"
      markdown={markdown}
      onChange={onChange}
      plugins={editorPlugins}
    />
  );
}
