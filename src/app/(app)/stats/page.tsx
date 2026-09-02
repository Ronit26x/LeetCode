import type { Metadata } from "next";
import Link from "next/link";
import { ChartBar } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { DifficultyBadge } from "@/components/common/badges";
import { ChartTooltipLayer } from "@/components/stats/chart-tooltip";
import { Columns, Heatmap, ResolveTimes, StatTile, TagMastery } from "@/components/stats/charts";
import { getStats } from "@/lib/stats/queries";
import { formatPercent, pluralize } from "@/lib/format";

export const metadata: Metadata = { title: "Stats" };

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-sm font-medium">{title}</h2>
      {hint ? <p className="mt-0.5 mb-3 text-2xs text-fg-subtle">{hint}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

export default async function StatsPage() {
  const s = await getStats();
  if (s.totals.reviews === 0 && s.totals.problems === 0) {
    return (
      <>
        <PageHeader title="Stats" description="Reviews, retention, and readiness for the interview date." />
        <EmptyState icon={<ChartBar size={28} />} title="No reviews yet" body="Charts appear after your first graded review." />
      </>
    );
  }
  const r = s.readiness;
  return (
    <ChartTooltipLayer>
      <PageHeader title="Stats" description="Reviews, retention, and readiness for the interview date." />
      <div className="flex flex-col gap-6">
        {r ? (
          <section className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-medium">Interview readiness</h2>
              <p className="text-2xs text-fg-subtle">
                {r.days === 0 ? "Today" : `${pluralize(r.days, "day")} to ${r.label}`}
              </p>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8">
              <div className="min-w-0">
                <p className="text-2xs text-fg-subtle">Mean predicted recall on {r.label} if not reviewed again</p>
                <p className="mt-1 text-5xl leading-none font-semibold [font-variant-numeric:proportional-nums]">{formatPercent(r.meanRecall)}</p>
                <p className="mt-2 text-md text-fg-muted">
                  {formatPercent(r.shareAbove90)} of {pluralize(r.cardCount, "active card")} above 90%
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-2xs text-fg-subtle">Weakest on {r.label}</p>
                {r.weakest.length === 0 ? (
                  <p className="mt-1 text-sm text-fg-subtle">Nothing scheduled yet.</p>
                ) : (
                  <ol className="mt-1 columns-1 gap-6 text-md sm:columns-2">
                    {r.weakest.map((w) => (
                      <li key={w.id} className="flex items-center gap-2 py-0.5 break-inside-avoid">
                        <span className="w-9 text-right text-2xs text-fg-subtle">{w.leetcodeNumber ?? ""}</span>
                        <Link href={`/problems/${w.id}`} className="inline-flex min-h-6 min-w-0 flex-1 items-center truncate hover:underline underline-offset-2">
                          {w.title}
                        </Link>
                        <DifficultyBadge difficulty={w.difficulty} plain />
                        <span className="w-10 text-right text-fg-muted">{formatPercent(w.recall)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </section>
        ) : (
          <p className="rounded-xl border border-border bg-surface px-5 py-4 text-md text-fg-muted">
            No upcoming interview date. Set one in Settings to see readiness, the retention ramp and the cram window.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="True retention, 7 days" value={formatPercent(s.retention.d7.rate)} sub={`${s.retention.d7.pass} of ${s.retention.d7.total} grades not Again · desired ${formatPercent(s.retention.desired)}`} />
          <StatTile label="True retention, 30 days" value={formatPercent(s.retention.d30.rate)} sub={`${s.retention.d30.pass} of ${s.retention.d30.total} grades not Again`} />
          <StatTile label="Reviews" value={s.totals.reviews} sub={`${s.totals.revises} revised · ${s.totals.resolves} resolved`} />
          <StatTile label="Active cards" value={s.totals.active} sub={`${s.byState.new} new · ${s.byState.review} review · ${s.byState.lapsed} lapsed`} />
        </div>

        <Section title="Reviews per day" hint="Calendar days in your time zone. Darker is more.">
          <Heatmap data={s.heatmap} tz={s.tz} />
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Stability" hint="Active cards by how long each memory is expected to hold at 90% recall.">
            <Columns data={s.stabilityBuckets} ariaLabel="Active cards by stability bucket" />
          </Section>
          <Section title="Problems by status">
            <dl className="grid grid-cols-2 gap-3 text-md">
              {(["active", "backlog", "suspended", "archived"] as const).map((k) => (
                <div key={k} className="flex items-baseline justify-between border-b border-border pb-1">
                  <dt className="text-fg-muted capitalize">{k}</dt>
                  <dd className="text-lg">{s.byStatus[k]}</dd>
                </div>
              ))}
            </dl>
            <h3 className="mt-5 text-2xs font-medium text-fg-subtle">Resolve time against the targets</h3>
            <div className="mt-2">
              <ResolveTimes rows={s.resolveTime} />
            </div>
          </Section>
        </div>

        <Section title="Mastery by tag" hint="Mean recall right now across active cards with the tag, weakest first. S is the mean stability.">
          <TagMastery rows={s.tagMastery} />
        </Section>
      </div>
    </ChartTooltipLayer>
  );
}
