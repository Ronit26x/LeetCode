import Link from "next/link";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { Markdown } from "@/components/notes/markdown";
import { CodeBlock } from "@/components/code/code-block";
import { DifficultyBadge } from "@/components/common/badges";
import type { Difficulty, Snippet } from "@/db/schema";
import { cn } from "@/lib/utils";

export interface CardBackData {
  keyInsight: string;
  approach: string;
  timeComplexity: string;
  spaceComplexity: string;
  pitfalls: string;
  notes: string;
  snippets: Pick<Snippet, "id" | "label" | "language" | "code">[];
  related: { id: string; title: string; leetcodeNumber: number | null; difficulty: Difficulty }[];
}

function Label({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1.5 text-2xs font-medium tracking-[0.02em] text-fg-subtle">{children}</h3>;
}

/**
 * Key insight first and biggest, then approach, complexity, pitfalls, similar problems,
 * then collapsed Extended notes and Code. Server-rendered so code is highlighted before the flip.
 */
export function CardBack({ data, className, openNotes, openCode }: { data: CardBackData; className?: string; openNotes?: boolean; openCode?: boolean }) {
  const hasComplexity = data.timeComplexity || data.spaceComplexity;
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div>
        {data.keyInsight ? (
          <p className="display-italic text-2xl leading-[1.3] text-foreground md:text-3xl md:leading-[1.25]">{data.keyInsight}</p>
        ) : (
          <p className="text-sm text-fg-subtle">No key insight written yet.</p>
        )}
      </div>
      {data.approach ? (
        <div>
          <Label>Approach</Label>
          <Markdown source={data.approach} className="text-[15px] leading-6" />
        </div>
      ) : null}
      {hasComplexity ? (
        <div className="flex gap-6">
          {data.timeComplexity ? (
            <div>
              <Label>Time</Label>
              <p className="font-mono text-md">{data.timeComplexity}</p>
            </div>
          ) : null}
          {data.spaceComplexity ? (
            <div>
              <Label>Space</Label>
              <p className="font-mono text-md">{data.spaceComplexity}</p>
            </div>
          ) : null}
        </div>
      ) : null}
      {data.pitfalls ? (
        <div>
          <Label>Pitfalls</Label>
          <Markdown source={data.pitfalls} className="text-[15px] leading-6" />
        </div>
      ) : null}
      {data.related.length ? (
        <div>
          <Label>Similar problems</Label>
          <ul className="flex flex-col gap-1">
            {data.related.map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                {r.leetcodeNumber ? <span className="w-10 text-fg-subtle">{r.leetcodeNumber}</span> : null}
                <Link href={`/problems/${r.id}`} className="hover:underline underline-offset-2">
                  {r.title}
                </Link>
                <DifficultyBadge difficulty={r.difficulty} plain />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.notes ? (
        <details className="group rounded-md border border-border" open={openNotes} data-section="notes">
          <summary className="flex h-9 cursor-pointer list-none items-center gap-2 px-3 text-md font-medium select-none [&::-webkit-details-marker]:hidden">
            <CaretDown size={14} className="text-fg-subtle transition-transform group-open:rotate-0 -rotate-90" />
            Extended notes
            <kbd className="ml-auto hidden rounded-[3px] border border-border px-1 font-sans text-2xs text-fg-subtle sm:inline">N</kbd>
          </summary>
          <div className="border-t border-border px-4 py-3">
            <Markdown source={data.notes} />
          </div>
        </details>
      ) : null}
      {data.snippets.length ? (
        <details className="group rounded-md border border-border" open={openCode} data-section="code">
          <summary className="flex h-9 cursor-pointer list-none items-center gap-2 px-3 text-md font-medium select-none [&::-webkit-details-marker]:hidden">
            <CaretDown size={14} className="text-fg-subtle transition-transform group-open:rotate-0 -rotate-90" />
            Code
            <span className="text-2xs font-normal text-fg-subtle">{data.snippets.length}</span>
            <kbd className="ml-auto hidden rounded-[3px] border border-border px-1 font-sans text-2xs text-fg-subtle sm:inline">C</kbd>
          </summary>
          <div className="flex flex-col gap-3 border-t border-border p-3">
            {data.snippets.map((s) => (
              <CodeBlock key={s.id} code={s.code} language={s.language} label={s.label} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
