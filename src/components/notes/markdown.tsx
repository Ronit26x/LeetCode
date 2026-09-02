import { MarkdownAsync, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeShiki from "@shikijs/rehype";
import { toString as hastToString } from "hast-util-to-string";
import type { Element } from "hast";
import { SHIKI_LANGS, SHIKI_THEMES } from "@/lib/shiki";
import { CopyButton } from "@/components/code/copy-button";
import { cn } from "@/lib/utils";

/* Fenced code arrives already highlighted by rehype-shiki as <pre class="shiki">. Wrap it in the code frame. */
const components: Components = {
  pre({ node, children, className, ...props }) {
    const raw = node ? hastToString(node as Element).replace(/\n$/, "") : "";
    return (
      <div className="code-block relative my-3 overflow-hidden rounded-md border border-border bg-sunken/60">
        <CopyButton text={raw} className="absolute top-1 right-1 z-10" />
        <div className="code-block-body overflow-x-auto py-3 text-md leading-5">
          <pre className={className} {...props}>
            {children}
          </pre>
        </div>
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

/** Server-rendered markdown for notes, approach and pitfalls. */
export function Markdown({ source, className }: { source: string; className?: string }) {
  if (!source.trim()) return null;
  return (
    <div className={cn("prose-notes", className)}>
      <MarkdownAsync
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeShiki, { themes: SHIKI_THEMES, defaultColor: false, fallbackLanguage: "text", langs: [...SHIKI_LANGS] }]]}
        components={components}
      >
        {source}
      </MarkdownAsync>
    </div>
  );
}
