"use client";

import * as React from "react";
import Link from "next/link";
import { DifficultyBadge, ModeBadge, TagBadge } from "@/components/common/badges";
import { formatDate, formatPercent } from "@/lib/format";
import type { ProblemListItem } from "@/lib/problems/queries";
import { cn } from "@/lib/utils";

export function QueueList({
  items,
  tz,
  softCap,
  startIndexOffset = 0,
}: {
  items: ProblemListItem[];
  tz: string;
  softCap: number | null;
  /** Position of the first item within the day's order, for the session index. */
  startIndexOffset?: number;
}) {
  const [showAll, setShowAll] = React.useState(false);
  // The cap hides the tail but never an overdue card.
  const visible = items.filter(
    (it, i) => showAll || softCap === null || i < softCap || (it.dueInDays ?? 0) < 0,
  );
  const hidden = items.length - visible.length;
  return (
    <div>
      <ol className="divide-y divide-border rounded-md border border-border">
        {visible.map((p) => {
          const index = startIndexOffset + items.indexOf(p);
          const overdue = (p.dueInDays ?? 0) < 0;
          return (
            <li key={p.id}>
              <Link
                href={`/review?i=${index}`}
                className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-hover/60 focus-visible:outline-2 focus-visible:-outline-offset-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    {p.leetcodeNumber ? (
                      <span className="w-9 shrink-0 text-2xs text-fg-subtle">
                        {p.leetcodeNumber}
                      </span>
                    ) : null}
                    <span className="truncate text-sm font-medium">{p.title}</span>
                    <DifficultyBadge difficulty={p.difficulty} plain />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-0 sm:pl-11">
                    {p.tags.slice(0, 3).map((t) => (
                      <TagBadge key={t.id} name={t.name} color={t.color} />
                    ))}
                    <span className="text-2xs text-fg-subtle">
                      {p.reviseCount} rev · {p.resolveCount} res
                      {p.card?.lastReview ? ` · last ${formatDate(p.card.lastReview, tz)}` : ""}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-2xs">
                  {p.suggestion ? <ModeBadge mode={p.suggestion.mode} /> : null}
                  <span className={cn("text-fg-muted", overdue && "text-hard")}>
                    {p.retrievability !== null ? `R ${formatPercent(p.retrievability)}` : ""}
                    {overdue ? ` · ${-(p.dueInDays ?? 0)}d overdue` : ""}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 text-md text-fg-muted hover:text-foreground"
        >
          Show {hidden} more
        </button>
      ) : null}
    </div>
  );
}
