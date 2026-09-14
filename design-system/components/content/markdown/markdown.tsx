import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { cn } from "../../../lib/utils";

type MarkdownProps = {
  children?: string | null;
  className?: string;
  components?: Components;
  skipHtml?: boolean;
};

const markdownPlugins = [remarkGfm, remarkBreaks];

const baseComponents: Components = {
  a({ className, href, target, rel, ...props }) {
    return (
      <a
        className={cn(
          "text-primary underline underline-offset-4 hover:text-primary/80",
          className,
        )}
        href={href}
        target={target ?? "_blank"}
        rel={rel ?? "noreferrer noopener"}
        {...props}
      />
    );
  },
};

export function Markdown({
  children,
  className,
  components,
  skipHtml = true,
}: MarkdownProps) {
  if (children == null) return null;

  return (
    <div data-slot="markdown" className={cn("markdown-content", className)}>
      <ReactMarkdown
        remarkPlugins={markdownPlugins}
        components={
          components ? { ...baseComponents, ...components } : baseComponents
        }
        skipHtml={skipHtml}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
