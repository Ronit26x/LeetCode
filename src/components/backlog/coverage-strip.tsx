import Link from "next/link";
import { TAG_DOT_CLASSES } from "@/components/common/badges";
import type { TopicCoverage } from "@/lib/problems/queries";
import { cn } from "@/lib/utils";

/**
 * Per primary topic: imported core / warmup counts and how many of them are already in the
 * schedule. Thin topics are where LeetCode problems need adding. Archived rows are not counted.
 */
export function CoverageStrip({ rows }: { rows: TopicCoverage[] }) {
  if (rows.length === 0) return null;
  const total = rows.reduce((a, r) => a + r.core + r.warmup, 0);
  const scheduled = rows.reduce((a, r) => a + r.scheduled, 0);
  return (
    <section aria-label="Topic coverage" className="mb-6">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-md font-medium">Coverage</h2>
        <p className="text-2xs text-fg-subtle">
          {total} core and warmup problems across {rows.length} topics, {scheduled} in the schedule.
          Core / warmup, then scheduled.
        </p>
      </div>
      <ol className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {rows.map((r) => (
          <li key={r.id} className="shrink-0">
            <Link
              href={`/backlog?tag=${r.id}`}
              className={cn(
                "flex min-w-32 flex-col gap-1 rounded-md border border-border bg-surface px-3 py-2 transition-colors hover:bg-hover",
                r.core + r.warmup <= 2 && "border-dashed",
              )}
            >
              <span className="flex items-center gap-1.5 text-md">
                <span
                  className={cn("size-2 shrink-0 rounded-full", TAG_DOT_CLASSES[r.color])}
                  aria-hidden
                />
                <span className="truncate">{r.name}</span>
              </span>
              <span className="flex items-baseline gap-2 text-2xs text-fg-muted">
                <span>
                  <span className="text-foreground">{r.core}</span> / {r.warmup}
                </span>
                <span className={cn(r.scheduled ? "text-good" : "text-fg-subtle")}>
                  {r.scheduled} scheduled
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
