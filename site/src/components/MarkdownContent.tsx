import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { assetUrl, siteUrl } from "../app/paths";
import { TileHand } from "./TileHand";

interface MarkdownContentProps {
  source: string;
  assetPath?: string;
}

function normalizeInternalLink(value: string | undefined): string | undefined {
  if (!value) return value;
  if (value.startsWith("/assets/")) return assetUrl(value);
  if (value.startsWith("/") && !value.startsWith("//")) return siteUrl(value);
  return value;
}

export function MarkdownContent({ source, assetPath }: MarkdownContentProps) {
  const components: Components = {
    a: ({ href, children, node: _node, ...props }) => (
      <a href={normalizeInternalLink(href)} {...props}>
        {children}
      </a>
    ),
    img: ({ src, alt, node: _node, ...props }) => (
      <img src={normalizeInternalLink(src)} alt={alt ?? ""} loading="lazy" {...props} />
    ),
    code: ({ className, children, node: _node, ...props }) => {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children, node: _node, ...props }) => {
      // Markdown provides an unrendered code element here, so inspect its
      // language before rendering it rather than testing for a TileHand child.
      if (
        isValidElement<{ className?: string; children?: ReactNode }>(children) &&
        /(?:^|\s)language-hand(?:\s|$)/.test(children.props.className ?? "")
      ) {
        return <TileHand mpsz={String(children.props.children).replace(/\n$/, "")} assetPath={assetPath ?? ""} />;
      }
      return <pre {...props}>{children}</pre>;
    },
    table: ({ children }) => (
      <div className="markdown-table-scroll" role="region" aria-label="横スクロール可能な表" tabIndex={0}>
        <table>{children}</table>
      </div>
    ),
  };

  return (
    <article className="site-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </article>
  );
}
