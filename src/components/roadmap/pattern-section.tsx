"use client";

import { ArrowSquareOut, Star } from "@phosphor-icons/react/dist/ssr";
import { DifficultyBadge } from "@/components/common/badges";
import { MarkButtons } from "@/components/roadmap/mark-buttons";
import {
  PATTERNS,
  leetcodeUrl,
  weekOf,
  type PatternCode,
  type RoadmapPriority,
  type RoadmapProblem,
  type RoadmapTier,
} from "@/lib/roadmap/data";
import { patternProgress, type RoadmapMarkStatus, type RoadmapMarks } from "@/lib/roadmap/marks";
import { cn } from "@/lib/utils";

const badge =
  "inline-flex h-5 shrink-0 items-center gap-1 rounded-sm px-1.5 text-2xs font-medium leading-none whitespace-nowrap";

const TIER: Record<RoadmapTier, { label: string; className: string; title: string }> = {
  core: {
    label: "Core",
    className: "bg-primary/12 text-primary",
    title: "In the 10-a-day plan, about 218 by Nov 3",
  },
  plus: {
    label: "Plus",
    className: "bg-sunken text-fg-muted",
    title: "The next 32 P2 hards, if you are ahead (250 in all)",
  },
  stretch: {
    label: "Stretch",
    className: "border border-border text-fg-subtle",
    title: "Only if you are well ahead",
  },
};

const PRIORITY: Record<RoadmapPriority, { className: string; title: string }> = {
  P1: {
    className: "border border-border-strong text-foreground",
    title: "Asked in the last 30 days, or LeetCode frequency 45 and up",
  },
  P2: { className: "border border-border text-fg-muted", title: "Asked in the last 3 months" },
  P3: { className: "border border-border text-fg-muted", title: "Asked in the last 6 months" },
  NC: {
    className: "border border-dashed border-border text-fg-muted",
    title: "Not Google-tagged; included because it is starred on NeetCode",
  },
  GAP: {
    className: "border border-dashed border-border-strong text-fg-muted",
    title: "Added to cover a technique the Google lists miss",
  },
};

function Tags({ p }: { p: RoadmapProblem }) {
  const tier = TIER[p.tier];
  return (
    <>
      <span className={cn(badge, tier.className)} title={tier.title}>
        {tier.label}
      </span>
      {p.solvedBefore ? (
        <span
          className={cn(badge, "border border-border text-fg-muted")}
          title="Accepted on your LeetCode account before the plan started: do it as a cold re-solve"
        >
          Solved before
        </span>
      ) : null}
      {p.neetcodeCategory ? (
        <span
          className={cn(badge, "border border-border text-fg-muted")}
          title={`Starred on NeetCode under ${p.neetcodeCategory}`}
        >
          <Star size={11} aria-hidden />
          {p.neetcodeCategory}
        </span>
      ) : null}
      {p.reported2026 ? (
        <span
          className={cn(badge, "bg-sunken text-foreground")}
          title="Named, or closely matched, in a 2026 Google interview report on LeetCode Discuss"
        >
          Reported 2026
        </span>
      ) : null}
    </>
  );
}

function TitleLink({
  p,
  done,
  className,
}: {
  p: RoadmapProblem;
  done: boolean;
  className?: string;
}) {
  return (
    <a
      href={leetcodeUrl(p.slug)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-1 font-medium underline-offset-2 hover:underline",
        done ? "text-fg-muted" : "text-foreground",
        className,
      )}
    >
      <span className={cn("truncate", done && "line-through")}>{p.title}</span>
      <ArrowSquareOut size={12} className="shrink-0 text-fg-subtle" aria-hidden />
      <span className="sr-only">(opens LeetCode in a new tab)</span>
    </a>
  );
}

/** One pattern: its trigger line, then the problems that pass the current filters. */
export function PatternSection({
  code,
  rows,
  marks,
  onToggle,
}: {
  code: PatternCode;
  rows: RoadmapProblem[];
  marks: RoadmapMarks;
  onToggle: (number: number, value: RoadmapMarkStatus) => void;
}) {
  const pattern = PATTERNS[code];
  const week = weekOf(pattern.week);
  const prog = patternProgress(code, marks);
  const id = `pattern-${code}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={id} className="text-sm font-medium">
          {pattern.name}
        </h2>
        <span className="rounded-sm bg-sunken px-1.5 py-0.5 text-2xs text-fg-muted">
          Week {pattern.week} · {week.dates}
        </span>
        <span className="ml-auto text-2xs text-fg-subtle">
          {prog.solvedBefore} solved before · {prog.done} / {prog.total} done
        </span>
      </div>
      <p className="max-w-[80ch] text-md text-fg-muted">
        <span className="font-medium text-foreground">Spot it: </span>
        {pattern.trigger}
      </p>

      {/* Desktop: dense table */}
      <div className="hidden overflow-x-auto rounded-md border border-border bg-surface md:block">
        <table className="w-full text-md">
          <thead>
            <tr className="h-9 border-b border-border text-left text-2xs font-medium text-fg-muted">
              <th className="w-14 pr-2 pl-3 text-right">#</th>
              <th className="min-w-64 pr-3">Problem</th>
              <th className="w-20">Difficulty</th>
              <th className="w-16">Priority</th>
              <th className="w-24">Window</th>
              <th className="w-14 text-right">Freq</th>
              <th className="min-w-48 pl-4">Tags</th>
              <th className="w-36 pr-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const mark = marks[p.number];
              const done = mark?.status === "done";
              return (
                <tr
                  key={p.number}
                  className="h-10 border-b border-border last:border-b-0 hover:bg-hover/60"
                >
                  <td className="pr-2 pl-3 text-right text-fg-subtle">{p.number}</td>
                  <td className="max-w-0 pr-3">
                    <TitleLink p={p} done={done} />
                  </td>
                  <td>
                    <DifficultyBadge difficulty={p.difficulty} plain />
                  </td>
                  <td>
                    <span
                      className={cn(badge, PRIORITY[p.priority].className)}
                      title={PRIORITY[p.priority].title}
                    >
                      {p.priority}
                    </span>
                  </td>
                  <td className="text-fg-muted">{p.window ?? ""}</td>
                  <td className="text-right text-fg-muted">{p.frequency}</td>
                  <td className="pl-4">
                    <div className="flex items-center gap-1 overflow-hidden">
                      <Tags p={p} />
                    </div>
                  </td>
                  <td className="pr-3 text-right">
                    <MarkButtons
                      title={p.title}
                      status={mark?.status ?? null}
                      onToggle={(v) => onToggle(p.number, v)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Phone: cards */}
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((p) => {
          const mark = marks[p.number];
          const done = mark?.status === "done";
          return (
            <li key={p.number} className="rounded-md border border-border bg-surface p-3">
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 text-2xs text-fg-subtle">{p.number}</span>
                <TitleLink p={p} done={done} className="text-sm" />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <DifficultyBadge difficulty={p.difficulty} plain />
                <span
                  className={cn(badge, PRIORITY[p.priority].className)}
                  title={PRIORITY[p.priority].title}
                >
                  {p.priority}
                </span>
                <Tags p={p} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-2xs text-fg-muted">
                <span>
                  {p.window ? `${p.window} · ` : ""}freq {p.frequency}
                </span>
                <MarkButtons
                  title={p.title}
                  status={mark?.status ?? null}
                  onToggle={(v) => onToggle(p.number, v)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
