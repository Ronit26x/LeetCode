import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Play } from "@phosphor-icons/react/dist/ssr";
import { formatInTimeZone } from "date-fns-tz";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { QueueList } from "@/components/today/queue-list";
import { DifficultyBadge } from "@/components/common/badges";
import { getTodayQueue } from "@/lib/queue/build";
import { formatDate, formatDuration, formatMinutes, formatPercent, pluralize } from "@/lib/format";
import { getDb } from "@/db";
import { inArray } from "drizzle-orm";
import { problems } from "@/db/schema";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const now = new Date();
  const q = await getTodayQueue(now);
  const { settings, stats, items, cram, cramActive } = q;
  const tz = settings.timezone;
  const dateLabel = formatInTimeZone(stats.dayStartAt, tz, "EEEE, MMMM d");
  const boundary = formatInTimeZone(stats.dayEndAt, tz, "h a");
  const db = await getDb();
  const againTitles = stats.doneToday.againIds.length
    ? await db.select({ id: problems.id, title: problems.title }).from(problems).where(inArray(problems.id, stats.doneToday.againIds))
    : [];
  const rampActive = stats.daysUntilInterview !== null && stats.daysUntilInterview >= 0 && stats.daysUntilInterview < settings.retentionRampDays && settings.retentionRampEnabled;
  const interviewLabel = stats.interviewDate ? formatDate(stats.interviewDate + "T12:00:00", tz, "MMM d") : null;

  const summary = [
    pluralize(stats.due, "card"),
    stats.revises ? pluralize(stats.revises, "revise") : null,
    stats.resolves ? pluralize(stats.resolves, "resolve") : null,
    stats.due ? `about ${formatMinutes(stats.estimatedMinutes)}` : null,
    stats.streak ? `${stats.streak}-day streak` : null,
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        title="Today"
        description={
          <>
            {dateLabel}. The next review day starts at {boundary}.
            {stats.daysUntilInterview !== null && stats.daysUntilInterview >= 0 && interviewLabel ? (
              <>
                {" "}
                {stats.daysUntilInterview === 0 ? "Interview day." : `${pluralize(stats.daysUntilInterview, "day")} to ${interviewLabel}.`}
              </>
            ) : null}
          </>
        }
        actions={
          stats.due > 0 ? (
            <Button size="lg" render={<Link href="/review" />}>
              <Play size={16} weight="fill" />
              Start session
            </Button>
          ) : null
        }
      >
        <p className="mt-2 text-md text-fg-muted">
          {summary.join(" · ")}
          {stats.doneToday.total ? ` · ${stats.doneToday.total} done` : ""}
          {rampActive ? ` · retention ${formatPercent(stats.retention)} (ramp)` : ""}
        </p>
      </PageHeader>

      {stats.due === 0 ? (
        <EmptyState
          icon={<CalendarCheck size={28} />}
          title={stats.doneToday.total ? "Done for today" : "Nothing due"}
          body={
            stats.doneToday.total
              ? `${stats.doneToday.revises} revised, ${stats.doneToday.resolves} resolved${stats.doneToday.seconds ? `, ${formatDuration(stats.doneToday.seconds)} on the clock` : ""}. ${pluralize(stats.tomorrow, "card")} due tomorrow.`
              : `Add a problem you solved today, or pick one from the backlog. ${pluralize(stats.tomorrow, "card")} due tomorrow.`
          }
          actions={
            <>
              <Button render={<Link href="/problems/new" />}>Add problem</Button>
              <Button variant="outline" render={<Link href="/backlog" />}>
                Open backlog
              </Button>
            </>
          }
        />
      ) : (
        <QueueList items={items} tz={tz} softCap={settings.dailySoftCap} />
      )}

      {stats.doneToday.total > 0 && stats.due > 0 ? (
        <p className="mt-3 text-2xs text-fg-subtle">
          Done today: {stats.doneToday.revises} revised, {stats.doneToday.resolves} resolved
          {againTitles.length ? ` · Again: ${againTitles.map((a) => a.title).join(", ")}` : ""}
        </p>
      ) : null}

      {cramActive ? (
        <section className="mt-10">
          <h2 className="display text-xl leading-7">Cram</h2>
          <p className="mt-1 mb-3 text-md text-fg-muted">
            Not due yet, sorted by the lowest predicted recall on {interviewLabel} if not reviewed again. Separate from the schedule above; reviewing one is a normal early review.
          </p>
          {cram.length === 0 ? (
            <p className="text-sm text-fg-subtle">Every scheduled card is predicted above the line.</p>
          ) : (
            <ol className="divide-y divide-border rounded-md border border-border">
              {cram.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      {p.leetcodeNumber ? <span className="w-9 shrink-0 text-2xs text-fg-subtle">{p.leetcodeNumber}</span> : null}
                      <Link href={`/problems/${p.id}`} className="truncate text-sm font-medium hover:underline underline-offset-2">
                        {p.title}
                      </Link>
                      <DifficultyBadge difficulty={p.difficulty} plain />
                    </div>
                  </div>
                  <span className="text-2xs text-fg-muted">{formatPercent(p.predictedInterviewRecall)} on {interviewLabel}</span>
                  <Button size="sm" variant="outline" render={<Link href={`/review?problem=${p.id}`} />}>
                    Review now
                  </Button>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}
    </>
  );
}
