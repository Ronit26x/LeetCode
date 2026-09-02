import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import type { StatsData } from "@/lib/stats/queries";
import { formatPercent, formatStability, DIFFICULTY_LABEL } from "@/lib/format";
import { TAG_DOT_CLASSES, DifficultyBadge } from "@/components/common/badges";
import { startOfCalendarDay } from "@/lib/day";
import { cn } from "@/lib/utils";

export function StatTile({ label, value, sub, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface px-4 py-3", className)}>
      <p className="text-2xs text-fg-subtle">{label}</p>
      <p className="mt-1 text-2xl leading-8 font-semibold text-foreground [font-variant-numeric:proportional-nums]">{value}</p>
      {sub ? <p className="mt-0.5 text-2xs text-fg-muted">{sub}</p> : null}
    </div>
  );
}

/** GitHub-style calendar heatmap: one hue, five alpha steps, weeks as columns. */
export function Heatmap({ data, tz }: { data: StatsData["heatmap"]; tz: string }) {
  const cell = 11;
  const gap = 2;
  const max = Math.max(1, ...data.map((d) => d.count));
  // Pad the start so columns begin on Sunday.
  const firstDow = startOfCalendarDay(data[0].day, tz).getUTCDay();
  const first = new Date(data[0].day + "T12:00:00Z");
  const dow0 = first.getUTCDay();
  void firstDow;
  const cells = data.map((d, i) => ({ ...d, col: Math.floor((i + dow0) / 7), row: (i + dow0) % 7 }));
  const cols = (cells.at(-1)?.col ?? 0) + 1;
  const width = cols * (cell + gap);
  const height = 7 * (cell + gap) + 16;
  const months: { col: number; label: string }[] = [];
  let lastMonth = "";
  for (const c of cells) {
    const m = c.day.slice(0, 7);
    if (m !== lastMonth && c.row === 0) {
      months.push({ col: c.col, label: formatInTimeZone(new Date(c.day + "T12:00:00Z"), "UTC", "MMM") });
      lastMonth = m;
    }
  }
  function alpha(n: number) {
    if (n === 0) return 0;
    const r = n / max;
    return r < 0.25 ? 0.25 : r < 0.5 ? 0.45 : r < 0.75 ? 0.7 : 1;
  }
  const total = data.reduce((a, d) => a + d.count, 0);
  return (
    <div className="overflow-x-auto">
      <svg width={width + 28} height={height} className="block" role="img" aria-label={`Reviews per day over the last year: ${total} reviews`}>
        <g transform="translate(28,0)">
          {months.map((m) => (
            <text key={m.col + m.label} x={m.col * (cell + gap)} y={10} className="fill-fg-subtle text-[10px]">
              {m.label}
            </text>
          ))}
          {cells.map((c) => (
            <rect
              key={c.day}
              x={c.col * (cell + gap)}
              y={16 + c.row * (cell + gap)}
              width={cell}
              height={cell}
              rx={2}
              tabIndex={c.count ? 0 : -1}
              data-tip={`${c.count} ${c.count === 1 ? "review" : "reviews"} on ${formatInTimeZone(new Date(c.day + "T12:00:00Z"), "UTC", "MMM d")}`}
              className={c.count ? "fill-primary outline-none" : "fill-sunken"}
              style={c.count ? { fillOpacity: alpha(c.count) } : undefined}
            />
          ))}
        </g>
        {["Mon", "Wed", "Fri"].map((d, i) => (
          <text key={d} x={0} y={16 + (1 + i * 2) * (cell + gap) + 9} className="fill-fg-subtle text-[10px]">
            {d}
          </text>
        ))}
      </svg>
    </div>
  );
}

/** Column chart, one series, bars capped at 24px, rounded at the data end only. */
export function Columns({ data, ariaLabel }: { data: { label: string; count: number }[]; ariaLabel: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const w = 320;
  const h = 140;
  const padL = 24;
  const padB = 20;
  const plotH = h - padB - 8;
  const band = (w - padL) / data.length;
  const barW = Math.min(24, band - 8);
  const ticks = [0, Math.ceil(max / 2), max].filter((t, i, a) => a.indexOf(t) === i);
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="block w-full max-w-[420px]" role="img" aria-label={ariaLabel}>
        {ticks.map((t) => {
          const y = 8 + plotH - (t / max) * plotH;
          return (
            <g key={t}>
              <line x1={padL} x2={w} y1={y} y2={y} className="stroke-border" strokeWidth={1} />
              <text x={padL - 4} y={y + 3} textAnchor="end" className="fill-fg-subtle text-[9px]">
                {t}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = padL + i * band + (band - barW) / 2;
          const bh = (d.count / max) * plotH;
          return (
            <g key={d.label}>
              {d.count > 0 ? (
                <path
                  d={`M${x},${8 + plotH} v${-Math.max(0, bh - 4)} a4,4 0 0 1 4,-4 h${barW - 8} a4,4 0 0 1 4,4 v${Math.max(0, bh - 4)} z`}
                  className="fill-primary"
                  data-tip={`${d.count} ${d.count === 1 ? "card" : "cards"} with stability ${d.label}`}
                  tabIndex={0}
                />
              ) : (
                <rect x={x} y={8 + plotH - 1} width={barW} height={1} className="fill-border" />
              )}
              <text x={x + barW / 2} y={h - 6} textAnchor="middle" className="fill-fg-muted text-[9px]">
                {d.label}
              </text>
              <title>{`${d.label}: ${d.count}`}</title>
            </g>
          );
        })}
      </svg>
      <details className="mt-1">
        <summary className="cursor-pointer text-2xs text-fg-subtle">Table</summary>
        <table className="mt-1 text-2xs">
          <tbody>
            {data.map((d) => (
              <tr key={d.label}>
                <td className="pr-4 text-fg-muted">{d.label}</td>
                <td className="text-right">{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Horizontal bars with the value at the tip, one series; the colored dot beside the name carries identity. */
export function TagMastery({ rows }: { rows: StatsData["tagMastery"] }) {
  const shown = rows.filter((r) => r.meanR !== null);
  if (shown.length === 0) return <p className="text-sm text-fg-subtle">No active cards with tags yet.</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {shown.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-md sm:grid sm:grid-cols-[minmax(0,10rem)_1fr_3rem_3.5rem]">
          <Link href={`/problems?tag=${r.id}`} className="flex min-w-0 flex-1 items-center gap-2 hover:underline underline-offset-2 sm:flex-none">
            <span className={cn("size-2 shrink-0 rounded-full", TAG_DOT_CLASSES[r.color])} aria-hidden />
            <span className="truncate">{r.name}</span>
            <span className="text-2xs text-fg-subtle">{r.count}</span>
          </Link>
          <div className="order-last h-2 basis-full rounded-[2px] bg-sunken sm:order-none sm:basis-auto" role="img" aria-label={`${r.name}: mean recall ${formatPercent(r.meanR)}`} data-tip={`${r.name}: mean recall ${formatPercent(r.meanR)}, mean stability ${r.meanS !== null ? formatStability(r.meanS) : "–"}`}>
            <div className="h-full rounded-[2px] bg-primary" style={{ width: `${Math.round((r.meanR ?? 0) * 100)}%` }} />
          </div>
          <span className="text-right text-fg-muted">{formatPercent(r.meanR)}</span>
          <span className="text-right text-2xs text-fg-subtle">S {r.meanS !== null ? formatStability(r.meanS) : "–"}</span>
        </li>
      ))}
    </ul>
  );
}

/** Average resolve time per difficulty against its target tick. */
export function ResolveTimes({ rows }: { rows: StatsData["resolveTime"] }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.avgMinutes ?? 0, r.target]));
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => {
        const avgW = r.avgMinutes !== null ? (r.avgMinutes / max) * 100 : 0;
        const tgt = (r.target / max) * 100;
        const over = r.avgMinutes !== null && r.avgMinutes > r.target;
        return (
          <li key={r.difficulty} className="grid grid-cols-[4.5rem_1fr_8rem] items-center gap-3 text-md">
            <DifficultyBadge difficulty={r.difficulty} plain />
            <div className="relative h-2 rounded-[2px] bg-sunken" data-tip={`${DIFFICULTY_LABEL[r.difficulty]}: ${r.avgMinutes !== null ? `${r.avgMinutes.toFixed(0)} min average over ${r.n}` : "no timed resolves"}, target ${r.target} min`}>
              {r.avgMinutes !== null ? <div className={cn("h-full rounded-[2px]", over ? "bg-hard" : "bg-primary")} style={{ width: `${Math.min(100, avgW)}%` }} /> : null}
              <div className="absolute top-[-3px] h-[14px] w-px bg-foreground/60" style={{ left: `${Math.min(100, tgt)}%` }} aria-hidden />
            </div>
            <span className="text-right text-2xs text-fg-muted">
              {r.avgMinutes !== null ? `${r.avgMinutes.toFixed(0)} min` : "–"} <span className="text-fg-subtle">/ {r.target} target</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
