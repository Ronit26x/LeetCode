import { CopyButton } from "@/components/code/copy-button";
import { cn } from "@/lib/utils";

export const LANGUAGE_LABEL: Record<string, string> = {
  cpp: "C++",
  c: "C",
  python: "Python",
  java: "Java",
  javascript: "JavaScript",
  typescript: "TypeScript",
  bash: "Shell",
  json: "JSON",
  sql: "SQL",
  text: "Text",
};

/** The frame around highlighted code: label, language, copy button, horizontal scroll inside. */
export function CodeBlockShell({
  code,
  html,
  label,
  language,
  className,
  compact,
}: {
  code: string;
  html: string;
  label?: string | null;
  language?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const lines = code.split("\n").length;
  return (
    <div
      className={cn(
        "code-block overflow-hidden rounded-md border border-border bg-sunken/60",
        className,
      )}
    >
      {!compact || label ? (
        <div className="flex h-8 items-center gap-2 border-b border-border px-3 text-2xs text-fg-muted">
          {label ? <span className="font-medium text-foreground">{label}</span> : null}
          <span>{LANGUAGE_LABEL[language ?? "text"] ?? language}</span>
          <span className="text-fg-subtle">{lines} lines</span>
          <CopyButton text={code} className="-mr-1.5 ml-auto" />
        </div>
      ) : (
        <CopyButton text={code} className="absolute top-1 right-1" />
      )}
      <div
        className="code-block-body overflow-x-auto py-3 text-md leading-5"
        // Shiki output: <pre class="shiki"><code><span class="line">…</span>…</code></pre>
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
