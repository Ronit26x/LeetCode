import type { CardRow, ProblemStatus } from "@/db/schema";
import { formatDate, formatDueRelative, formatPercent, formatStability } from "@/lib/format";
import type { ProblemDetail } from "@/lib/problems/queries";

function Row({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-2xs text-fg-subtle">{label}</dt>
      <dd className={muted ? "text-md text-fg-muted" : "text-md text-foreground"}>{value}</dd>
    </div>
  );
}

const STATE_LABEL: Record<string, string> = { new: "New", review: "Review", lapsed: "Lapsed" };

export function MemoryPanel({
  card,
  computed,
  reviseCount,
  resolveCount,
  status,
  tz,
  interviewDate,
}: {
  card: CardRow | null;
  computed: ProblemDetail["computed"];
  reviseCount: number;
  resolveCount: number;
  status: ProblemStatus;
  tz: string;
  interviewDate: string | null;
}) {
  const interviewLabel = interviewDate
    ? formatDate(interviewDate + "T12:00:00", tz, "MMM d")
    : null;
  return (
    <section className="rounded-xl border border-border bg-surface px-4 py-3">
      <h2 className="text-md font-medium">Memory</h2>
      {!card ? (
        <p className="mt-2 text-md text-fg-muted">
          Not scheduled yet. Mark it solved to start the clock.
        </p>
      ) : (
        <dl className="mt-1 divide-y divide-border">
          <Row
            label="State"
            value={
              status === "active"
                ? (STATE_LABEL[computed.memoryState ?? "new"] ?? "New")
                : status[0].toUpperCase() + status.slice(1)
            }
          />
          <Row label="Stability" value={formatStability(card.stability)} />
          <Row
            label="Difficulty"
            value={card.difficulty ? `${card.difficulty.toFixed(1)} / 10` : "–"}
          />
          <Row label="Recall now" value={formatPercent(computed.retrievability)} />
          <Row
            label="Due"
            value={
              <span>
                {formatDate(card.due, tz)}{" "}
                <span className="text-fg-subtle">
                  {computed.dueInDays !== null ? formatDueRelative(computed.dueInDays) : ""}
                </span>
              </span>
            }
          />
          {interviewLabel ? (
            <Row
              label={`Recall on ${interviewLabel} if not reviewed again`}
              value={formatPercent(computed.predictedInterviewRecall)}
            />
          ) : null}
          <Row label="Revised" value={reviseCount} />
          <Row label="Resolved" value={resolveCount} />
          <Row label="Lapses" value={card.lapses} muted />
          <Row
            label="Last reviewed"
            value={card.lastReview ? formatDate(card.lastReview, tz, "MMM d, h:mm a") : "–"}
            muted
          />
        </dl>
      )}
    </section>
  );
}
