import type { ReviewLogRow } from "@/db/schema";
import { formatDate, formatDuration, formatInterval, MODE_LABEL, RATING_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

const RATING_CLASS: Record<number, string> = {
  0: "text-fg-subtle",
  1: "text-again",
  2: "text-hard",
  3: "text-good",
  4: "text-easy",
};

export function ReviewHistory({ logs, tz }: { logs: ReviewLogRow[]; tz: string }) {
  return (
    <section className="rounded-xl border border-border bg-surface px-4 py-3">
      <h2 className="text-md font-medium">History</h2>
      {logs.length === 0 ? (
        <p className="mt-2 text-md text-fg-muted">No reviews yet.</p>
      ) : (
        <ol className="mt-1 divide-y divide-border">
          {logs.map((l) => (
            <li key={l.id} className={cn("flex flex-col gap-0.5 py-2", l.undoneAt && "opacity-50")}>
              <div className="flex items-center gap-2 text-md">
                <span className="text-fg-muted">{formatDate(l.reviewedAt, tz, "MMM d")}</span>
                <span className="text-2xs text-fg-subtle">
                  {l.rating === 0 ? "" : MODE_LABEL[l.mode]}
                </span>
                <span className={cn("font-medium", RATING_CLASS[l.rating])}>
                  {RATING_LABEL[l.rating]}
                </span>
                {l.rating > 0 ? (
                  <span className="ml-auto text-fg-subtle">
                    {formatInterval(l.resultScheduledDays)}
                  </span>
                ) : null}
              </div>
              {l.durationSeconds || l.note || l.undoneAt ? (
                <div className="flex flex-wrap gap-x-3 text-2xs text-fg-subtle">
                  {l.durationSeconds ? <span>{formatDuration(l.durationSeconds)}</span> : null}
                  {l.note ? <span className="text-fg-muted">{l.note}</span> : null}
                  {l.undoneAt ? <span>undone</span> : null}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
