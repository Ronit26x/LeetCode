import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDuration, pluralize } from "@/lib/format";
import type { QueueStats } from "@/lib/queue/build";

export function SessionSummary({
  stats,
  againTitles,
}: {
  stats: QueueStats;
  againTitles: { id: string; title: string }[];
}) {
  const d = stats.doneToday;
  return (
    <div className="mx-auto max-w-[680px]">
      <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
        <h1 className="display text-2xl leading-8">
          {d.total ? "Session complete" : "Nothing due"}
        </h1>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-md sm:grid-cols-4">
          <div>
            <dt className="text-2xs text-fg-subtle">Cards</dt>
            <dd className="text-lg">{d.total}</dd>
          </div>
          <div>
            <dt className="text-2xs text-fg-subtle">Revised</dt>
            <dd className="text-lg">{d.revises}</dd>
          </div>
          <div>
            <dt className="text-2xs text-fg-subtle">Resolved</dt>
            <dd className="text-lg">{d.resolves}</dd>
          </div>
          <div>
            <dt className="text-2xs text-fg-subtle">On the clock</dt>
            <dd className="text-lg">{d.seconds ? formatDuration(d.seconds) : "–"}</dd>
          </div>
        </dl>
        {againTitles.length ? (
          <div className="mt-5">
            <p className="text-2xs text-fg-subtle">Again today</p>
            <ul className="mt-1 flex flex-col gap-1 text-sm">
              {againTitles.map((a) => (
                <li key={a.id}>
                  <Link href={`/problems/${a.id}`} className="underline-offset-2 hover:underline">
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mt-5 text-md text-fg-muted">
          {pluralize(stats.tomorrow, "card")} due tomorrow.
        </p>
        <div className="mt-6 flex gap-2">
          <Button render={<Link href="/today" />}>Back to Today</Button>
          <Button variant="outline" render={<Link href="/problems/new" />}>
            Add problem
          </Button>
        </div>
      </div>
    </div>
  );
}
