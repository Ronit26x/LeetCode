import type { Pace, PaceGoal, PaceVerdictKind } from "@/lib/roadmap/pace";
import { cn } from "@/lib/utils";

const VERDICT_CLASS: Record<PaceVerdictKind, string> = {
  done: "text-good",
  "on-track": "text-good",
  due: "text-hard",
  "not-started": "text-fg-muted",
  behind: "text-again",
};

function Goal({ goal }: { goal: PaceGoal }) {
  const pct = Math.min(100, (100 * goal.done) / goal.total);
  const marker = Math.min(100, (100 * goal.expected) / goal.total);
  const need =
    goal.remaining <= 0
      ? "Finished"
      : goal.perDay === null
        ? "No practice days left"
        : `Needs ${goal.perDay.toFixed(1)} a day from here`;
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-md border border-border px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2 text-2xs">
        <span className="font-medium text-fg-muted">{goal.label}</span>
        <span className="text-fg-subtle">{goal.total} problems</span>
      </div>
      <p className="text-xl leading-7 font-semibold [font-variant-numeric:proportional-nums]">
        {goal.done} <span className="font-normal text-fg-subtle">/ {goal.total}</span>
      </p>
      <div
        className="relative h-1.5 rounded-sm bg-sunken"
        role="img"
        aria-label={`${goal.done} of ${goal.total} done, the plan is at ${goal.expected}`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-sm bg-primary"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute -inset-y-0.5 w-0.5 bg-foreground"
          style={{ left: `calc(${marker}% - 1px)` }}
          title={`The plan is at ${goal.expected} by the end of today`}
        />
      </div>
      <p className="text-2xs text-fg-muted">{need}</p>
      <p className={cn("text-2xs font-medium", VERDICT_CLASS[goal.verdict.kind])}>
        {goal.verdict.text}
      </p>
    </div>
  );
}

/** Done marks against the plan line per tier: the bar is what is done, the tick is where the plan is today. */
export function PacePanel({ pace }: { pace: Pace }) {
  return (
    <section
      aria-labelledby="roadmap-pace-title"
      className="rounded-xl border border-border bg-surface p-5"
    >
      <h2 id="roadmap-pace-title" className="text-sm font-medium">
        Pace
      </h2>
      <p className="mt-0.5 max-w-[80ch] text-2xs text-fg-subtle">{pace.summary}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {pace.goals.map((g) => (
          <Goal key={g.key} goal={g} />
        ))}
      </div>
    </section>
  );
}
