import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { DifficultyBadge, TagBadge } from "@/components/common/badges";
import type { Difficulty, TagColor } from "@/db/schema";
import { cn } from "@/lib/utils";

export interface CardFrontData {
  title: string;
  leetcodeNumber: number | null;
  difficulty: Difficulty;
  url: string | null;
  promptSummary: string;
  tags: { id: string; name: string; color: TagColor }[];
}

/** Title, number, difficulty, tags, link, and the user's own restatement. Nothing else, ever. */
export function CardFront({ data, className, compact }: { data: CardFrontData; className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-wrap items-center gap-2 text-2xs text-fg-muted">
        {data.leetcodeNumber ? <span>{data.leetcodeNumber}</span> : null}
        <DifficultyBadge difficulty={data.difficulty} plain />
        {data.tags.map((t) => (
          <TagBadge key={t.id} name={t.name} color={t.color} />
        ))}
        {data.url ? (
          <a
            href={data.url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex h-6 items-center gap-1 rounded-sm px-1 text-2xs text-fg-muted hover:bg-hover hover:text-foreground"
          >
            LeetCode <ArrowSquareOut size={12} />
          </a>
        ) : null}
      </div>
      <h2 className={cn("display leading-tight", compact ? "text-2xl" : "text-3xl")}>{data.title}</h2>
      {data.promptSummary ? (
        <p className="text-base leading-7 text-foreground">{data.promptSummary}</p>
      ) : (
        <p className="text-sm text-fg-subtle">No restatement written yet.</p>
      )}
    </div>
  );
}
