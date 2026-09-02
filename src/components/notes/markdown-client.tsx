"use client";

import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { HighlightedCode } from "@/components/code/highlighted-code";
import { cn } from "@/lib/utils";

/* Live preview: react-markdown renders synchronously; fenced blocks highlight on the client. */
const components: Components = {
  pre({ children }) {
    return <>{children}</>;
  },
  code({ className, children, node, ...props }) {
    const match = /language-([\w+-]+)/.exec(className ?? "");
    const isBlock = node?.position && String(children).includes("\n") ? true : !!match;
    if (!isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    const code = String(children).replace(/\n$/, "");
    return (
      <div className="my-3">
        <HighlightedCode code={code} language={match?.[1] ?? "text"} compact />
      </div>
    );
  },
  a({ href, children }) {
    const external = href && /^https?:/i.test(href);
    return (
      <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
        {children}
      </a>
    );
  },
};

export function MarkdownClient({ source, className }: { source: string; className?: string }) {
  if (!source.trim()) return <p className="text-sm text-fg-subtle">Nothing to preview yet.</p>;
  return (
    <div className={cn("prose-notes", className)}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </Markdown>
    </div>
  );
}
