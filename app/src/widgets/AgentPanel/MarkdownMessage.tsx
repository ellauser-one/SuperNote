/**
 * [INPUT]: 依赖 react-markdown、shared/ui/cn；样式类 .ds-md 来自 index.css
 * [OUTPUT]: 对外提供 MarkdownMessage
 * [POS]: widgets/AgentPanel 助手消息 Markdown 渲染；用户消息仍用纯文本
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import ReactMarkdown from "react-markdown";

import { cn } from "../../shared/ui/cn";

type MarkdownMessageProps = {
  content: string;
  className?: string;
};

export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  if (!content) {
    return null;
  }

  return (
    <div className={cn("ds-md font-helvetica-now text-ui leading-relaxed", className)}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="ds-md__p">{children}</p>,
          ul: ({ children }) => <ul className="ds-md__list">{children}</ul>,
          ol: ({ children }) => (
            <ol className="ds-md__list ds-md__list--ordered">{children}</ol>
          ),
          li: ({ children }) => <li className="ds-md__li">{children}</li>,
          strong: ({ children }) => (
            <strong className="ds-md__strong">{children}</strong>
          ),
          em: ({ children }) => <em className="ds-md__em">{children}</em>,
          code: ({ children, className: codeClass }) => {
            const isBlock = Boolean(codeClass);
            if (isBlock) {
              return <code className={cn("ds-md__code-block", codeClass)}>{children}</code>;
            }
            return <code className="ds-md__code-inline">{children}</code>;
          },
          pre: ({ children }) => <pre className="ds-md__pre">{children}</pre>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="ds-md__link"
              target="_blank"
              rel="noreferrer noopener"
            >
              {children}
            </a>
          ),
          h1: ({ children }) => <h3 className="ds-md__heading">{children}</h3>,
          h2: ({ children }) => <h3 className="ds-md__heading">{children}</h3>,
          h3: ({ children }) => <h3 className="ds-md__heading">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="ds-md__quote">{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
