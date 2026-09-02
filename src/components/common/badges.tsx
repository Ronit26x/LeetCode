import type { Difficulty, ReviewMode, TagColor } from "@/db/schema";
import { DIFFICULTY_LABEL, MODE_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MemoryState } from "@/lib/problems/queries";

export const TAG_COLOR_CLASSES: Record<TagColor, string> = {
  red: "bg-tag-red/14 text-tag-red",
  orange: "bg-tag-orange/14 text-tag-orange",
  amber: "bg-tag-amber/16 text-tag-amber",
  lime: "bg-tag-lime/14 text-tag-lime",
  green: "bg-tag-green/14 text-tag-green",
  teal: "bg-tag-teal/14 text-tag-teal",
  sky: "bg-tag-sky/14 text-tag-sky",
  blue: "bg-tag-blue/14 text-tag-blue",
  indigo: "bg-tag-indigo/14 text-tag-indigo",
  violet: "bg-tag-violet/14 text-tag-violet",
  pink: "bg-tag-pink/14 text-tag-pink",
  stone: "bg-tag-stone/16 text-tag-stone",
};

export const TAG_DOT_CLASSES: Record<TagColor, string> = {
  red: "bg-tag-red",
  orange: "bg-tag-orange",
  amber: "bg-tag-amber",
  lime: "bg-tag-lime",
  green: "bg-tag-green",
  teal: "bg-tag-teal",
  sky: "bg-tag-sky",
  blue: "bg-tag-blue",
  indigo: "bg-tag-indigo",
  violet: "bg-tag-violet",
  pink: "bg-tag-pink",
  stone: "bg-tag-stone",
};

const base =
  "inline-flex h-5 max-w-full items-center gap-1 rounded-sm px-1.5 text-2xs font-medium leading-none whitespace-nowrap";

export function TagBadge({
  name,
  color,
  className,
}: {
  name: string;
  color: TagColor;
  className?: string;
}) {
  return (
    <span className={cn(base, TAG_COLOR_CLASSES[color], className)} title={name}>
      <span className="truncate">{name}</span>
    </span>
  );
}

const DIFF_CLASSES: Record<Difficulty, string> = {
  easy: "text-diff-easy bg-diff-easy/12",
  medium: "text-diff-medium bg-diff-medium/14",
  hard: "text-diff-hard bg-diff-hard/12",
};

export function DifficultyBadge({
  difficulty,
  className,
  plain,
}: {
  difficulty: Difficulty;
  className?: string;
  plain?: boolean;
}) {
  if (plain) {
    return (
      <span
        className={cn("text-2xs font-medium", DIFF_CLASSES[difficulty].split(" ")[0], className)}
      >
        {DIFFICULTY_LABEL[difficulty]}
      </span>
    );
  }
  return (
    <span className={cn(base, DIFF_CLASSES[difficulty], className)}>
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}

export function ModeBadge({ mode, className }: { mode: ReviewMode; className?: string }) {
  return (
    <span
      className={cn(
        base,
        mode === "resolve" ? "bg-primary/12 text-primary" : "border border-border text-fg-muted",
        className,
      )}
    >
      {MODE_LABEL[mode]}
    </span>
  );
}

const MEMORY_LABEL: Record<MemoryState, string> = {
  new: "New",
  review: "Review",
  lapsed: "Lapsed",
};

export function MemoryBadge({
  state,
  className,
}: {
  state: MemoryState | null;
  className?: string;
}) {
  if (!state)
    return <span className={cn(base, "bg-sunken text-fg-subtle", className)}>Backlog</span>;
  return (
    <span
      className={cn(
        base,
        state === "lapsed"
          ? "bg-again/12 text-again"
          : state === "new"
            ? "bg-sunken text-fg-muted"
            : "bg-sunken text-fg-muted",
        className,
      )}
    >
      {MEMORY_LABEL[state]}
    </span>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: "backlog" | "active" | "suspended" | "archived";
  className?: string;
}) {
  const label = {
    backlog: "Backlog",
    active: "Active",
    suspended: "Suspended",
    archived: "Archived",
  }[status];
  return (
    <span
      className={cn(
        base,
        status === "suspended" ? "bg-hard/14 text-hard" : "bg-sunken text-fg-muted",
        className,
      )}
    >
      {label}
    </span>
  );
}

const SOURCE_LABEL: Record<"leetcode" | "gfg" | "other", string> = {
  leetcode: "LC",
  gfg: "GFG",
  other: "Other",
};

/** A small source mark. LeetCode problems also carry a number, so the mark is shown for the others by default. */
export function SourceBadge({
  source,
  className,
  always,
}: {
  source: "leetcode" | "gfg" | "other";
  className?: string;
  always?: boolean;
}) {
  if (source === "leetcode" && !always) return null;
  return (
    <span
      className={cn(
        base,
        "border border-border-strong font-mono text-[10px] tracking-[0.04em] text-fg-muted",
        className,
      )}
      title={
        source === "gfg" ? "GeeksforGeeks" : source === "leetcode" ? "LeetCode" : "Other source"
      }
    >
      {SOURCE_LABEL[source]}
    </span>
  );
}

const TIER_CLASSES: Record<"core" | "warmup" | "skip", string> = {
  core: "bg-primary/12 text-primary",
  warmup: "bg-sunken text-fg-muted",
  skip: "bg-sunken text-fg-subtle",
};
const TIER_LABEL: Record<"core" | "warmup" | "skip", string> = {
  core: "Core",
  warmup: "Warmup",
  skip: "Skip",
};

export function TierBadge({
  tier,
  className,
}: {
  tier: "core" | "warmup" | "skip" | null;
  className?: string;
}) {
  if (!tier) return null;
  return <span className={cn(base, TIER_CLASSES[tier], className)}>{TIER_LABEL[tier]}</span>;
}
