import { highlightCode } from "@/lib/shiki";
import { CodeBlockShell } from "@/components/code/code-block-shell";

/** Server-rendered, Shiki-highlighted read view of a snippet. */
export async function CodeBlock({
  code,
  language,
  label,
  className,
}: {
  code: string;
  language: string;
  label?: string | null;
  className?: string;
}) {
  const html = await highlightCode(code, language);
  return (
    <CodeBlockShell
      code={code}
      html={html}
      label={label}
      language={language}
      className={className}
    />
  );
}
