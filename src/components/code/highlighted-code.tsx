"use client";

import * as React from "react";
import { CodeBlockShell } from "@/components/code/code-block-shell";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function plainHtml(code: string) {
  const lines = code.split("\n").map((l) => `<span class="line">${escapeHtml(l)}</span>`);
  return `<pre class="shiki"><code>${lines.join("\n")}</code></pre>`;
}

/** Client-side highlighting for live previews. Renders plain text until Shiki is ready. */
export function HighlightedCode({
  code,
  language,
  label,
  compact,
}: {
  code: string;
  language: string;
  label?: string | null;
  compact?: boolean;
}) {
  const [html, setHtml] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    import("@/lib/shiki").then(({ highlightCode }) =>
      highlightCode(code, language).then((out) => {
        if (!cancelled) setHtml(out);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [code, language]);
  return (
    <CodeBlockShell
      code={code}
      html={html ?? plainHtml(code)}
      label={label}
      language={language}
      compact={compact}
    />
  );
}
