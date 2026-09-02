"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArrowSquareOut, Tag, X } from "@phosphor-icons/react/dist/ssr";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DifficultyBadge,
  SourceBadge,
  TagBadge,
  TierBadge,
  TAG_DOT_CLASSES,
} from "@/components/common/badges";
import { MarkSolvedDialog } from "@/components/problems/mark-solved-dialog";
import {
  addTagsToProblems,
  archiveProblems,
  removeTagFromProblems,
  setTier,
} from "@/lib/problems/actions";
import type { ProblemListItem, TagBrief } from "@/lib/problems/queries";
import { solvedAgoLabel } from "@/lib/backlog";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const SOURCE_NAME = { leetcode: "LeetCode", gfg: "GFG", other: "another source" } as const;

export function BacklogList({
  items,
  tags,
  tz,
  now,
  allowEasyInRevise,
}: {
  items: ProblemListItem[];
  tags: TagBrief[];
  tz: string;
  now: Date;
  allowEasyInRevise: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pending, startTransition] = React.useTransition();
  const ids = [...selected];
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function run(label: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? "Something went wrong.");
        return;
      }
      toast.success(label);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {ids.length > 0 ? (
        <div className="sticky top-12 z-20 flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 shadow-float">
          <span className="text-md font-medium">{ids.length} selected</span>
          <span className="text-2xs text-fg-subtle">Tier</span>
          {(["core", "warmup", "skip"] as const).map((t) => (
            <Button
              key={t}
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(`Tier set to ${t}`, () => setTier(ids, t))}
            >
              {t === "core" ? "Core" : t === "warmup" ? "Warmup" : "Skip"}
            </Button>
          ))}
          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm" disabled={pending} />}>
              <Tag size={14} />
              Add tag
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-72 w-56 overflow-y-auto p-1">
              {tags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => run("Tag added", () => addTagsToProblems(ids, [t.id]))}
                  className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-md hover:bg-hover"
                >
                  <span
                    className={cn("size-2 rounded-full", TAG_DOT_CLASSES[t.color])}
                    aria-hidden
                  />
                  {t.name}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm" disabled={pending} />}>
              <X size={14} />
              Remove tag
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-72 w-56 overflow-y-auto p-1">
              {tags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => run("Tag removed", () => removeTagFromProblems(ids, t.id))}
                  className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-md hover:bg-hover"
                >
                  <span
                    className={cn("size-2 rounded-full", TAG_DOT_CLASSES[t.color])}
                    aria-hidden
                  />
                  {t.name}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run("Archived", () => archiveProblems(ids))}
          >
            <Archive size={14} />
            Archive
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      ) : null}

      <ul className="divide-y divide-border rounded-md border border-border">
        <li className="flex h-8 items-center gap-3 px-3 text-2xs text-fg-subtle">
          <Checkbox
            checked={allSelected}
            onCheckedChange={() =>
              setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)))
            }
            aria-label="Select all"
          />
          <span>Select all</span>
        </li>
        {items.map((p) => {
          const ago = solvedAgoLabel(p.priorSolvedAt, p.priorSolvedPrecision, now);
          return (
            <li
              key={p.id}
              className={cn(
                "flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3",
                selected.has(p.id) && "bg-primary/6",
              )}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <Checkbox
                  checked={selected.has(p.id)}
                  onCheckedChange={() => toggle(p.id)}
                  aria-label={`Select ${p.title}`}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    {p.leetcodeNumber ? (
                      <span className="text-2xs text-fg-subtle">{p.leetcodeNumber}</span>
                    ) : null}
                    <Link
                      href={`/problems/${p.id}`}
                      className="truncate text-sm font-medium underline-offset-2 hover:underline"
                    >
                      {p.title}
                    </Link>
                    <SourceBadge source={p.source} />
                    <DifficultyBadge difficulty={p.difficulty} plain />
                    <TierBadge tier={p.tier} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-2xs text-fg-subtle">
                    {p.tags.slice(0, 4).map((t) => (
                      <TagBadge key={t.id} name={t.name} color={t.color} />
                    ))}
                    {p.tags.length > 4 ? <span>+{p.tags.length - 4}</span> : null}
                    <span>
                      {ago
                        ? `solved on ${SOURCE_NAME[p.source]} ${ago}`
                        : `added ${formatDate(p.createdAt, tz)}`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 pl-7 sm:pl-0">
                {p.url ? (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${p.title} on ${SOURCE_NAME[p.source]}`}
                    className="hidden text-fg-muted hover:text-foreground sm:inline-flex"
                  >
                    <ArrowSquareOut size={16} />
                  </a>
                ) : null}
                {p.priorSolvedAt ? (
                  <MarkSolvedDialog
                    id={p.id}
                    title={p.title}
                    mode="revise"
                    variant="outline"
                    allowEasyInRevise={allowEasyInRevise}
                  />
                ) : null}
                <MarkSolvedDialog
                  id={p.id}
                  title={p.title}
                  mode="resolve"
                  label={p.priorSolvedAt ? "Solved it again" : "Solved it"}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
