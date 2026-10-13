"use client";

import * as React from "react";
import { toast } from "sonner";
import { StatTile } from "@/components/stats/charts";
import { PacePanel } from "@/components/roadmap/pace-panel";
import { PatternSection } from "@/components/roadmap/pattern-section";
import { RoadmapGraph } from "@/components/roadmap/roadmap-graph";
import { RoadmapKey } from "@/components/roadmap/roadmap-key";
import { RoadmapToolbar } from "@/components/roadmap/roadmap-toolbar";
import { setRoadmapMark } from "@/lib/roadmap/actions";
import {
  PATTERN_CODES,
  ROADMAP_PROBLEMS,
  problemsOf,
  type PatternCode,
  type WeekNumber,
} from "@/lib/roadmap/data";
import { EMPTY_FILTERS, passesFilters, type RoadmapFilters } from "@/lib/roadmap/filters";
import {
  overallProgress,
  patternProgress,
  type RoadmapMarkStatus,
  type RoadmapMarks,
} from "@/lib/roadmap/marks";
import { computePace } from "@/lib/roadmap/pace";

const HARD = ROADMAP_PROBLEMS.filter((p) => p.difficulty === "hard");
const SOLVED_BEFORE = ROADMAP_PROBLEMS.filter((p) => p.solvedBefore).length;

/**
 * The whole roadmap screen below the page header. Marks are kept in local state and written
 * through a server action optimistically; a failed write rolls the mark back and says so.
 */
export function RoadmapView({
  initialMarks,
  today,
}: {
  initialMarks: RoadmapMarks;
  today: string;
}) {
  const [marks, setMarks] = React.useState<RoadmapMarks>(initialMarks);
  const [filters, setFilters] = React.useState<RoadmapFilters>(EMPTY_FILTERS);
  const [, startTransition] = React.useTransition();
  const listRef = React.useRef<HTMLDivElement>(null);

  const toggle = React.useCallback(
    (number: number, value: RoadmapMarkStatus) => {
      const current = marks[number];
      const next = current?.status === value ? null : value;
      setMarks((prev) => {
        const copy = { ...prev };
        if (next === null) delete copy[number];
        else copy[number] = { status: next, doneOn: next === "done" ? today : null };
        return copy;
      });
      startTransition(async () => {
        const res = await setRoadmapMark({ number, status: next });
        if (!res.ok) {
          setMarks((prev) => {
            const copy = { ...prev };
            if (current) copy[number] = current;
            else delete copy[number];
            return copy;
          });
          toast.error(res.error);
          return;
        }
        const saved = res.data;
        if (saved) setMarks((prev) => ({ ...prev, [number]: saved }));
      });
    },
    [marks, today],
  );

  const pace = React.useMemo(() => computePace(marks, today), [marks, today]);
  const overall = React.useMemo(() => overallProgress(marks), [marks]);
  const hardsDone = React.useMemo(
    () => HARD.filter((p) => marks[p.number]?.status === "done").length,
    [marks],
  );
  const patternsComplete = React.useMemo(
    () =>
      PATTERN_CODES.filter((c) => {
        const p = patternProgress(c, marks);
        return p.total > 0 && p.done === p.total;
      }).length,
    [marks],
  );
  const sections = React.useMemo(
    () =>
      PATTERN_CODES.map((code) => ({
        code,
        rows: problemsOf(code).filter((p) => passesFilters(p, filters, marks[p.number])),
      })).filter((s) => s.rows.length > 0),
    [filters, marks],
  );
  const shown = sections.reduce((a, s) => a + s.rows.length, 0);

  function scrollToList() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    listRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  function selectPattern(code: PatternCode) {
    const clearing = filters.pattern === code;
    setFilters((f) => ({ ...f, pattern: clearing ? "" : code }));
    if (!clearing) scrollToList();
  }

  function selectWeek(week: WeekNumber) {
    setFilters((f) => ({ ...f, week: f.week === week ? 0 : week }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Done"
          value={`${overall.done} / ${overall.total}`}
          sub={`${overall.redo} marked redo`}
        />
        <StatTile
          label="Hards done"
          value={`${hardsDone} / ${HARD.length}`}
          sub="Hard problems on the list"
        />
        <StatTile label="Solved before" value={SOLVED_BEFORE} sub="Cold re-solves" />
        <StatTile
          label="Patterns"
          value={PATTERN_CODES.length}
          sub={`${patternsComplete} complete`}
        />
      </div>

      <PacePanel pace={pace} />

      <section aria-labelledby="roadmap-graph-title">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <h2 id="roadmap-graph-title" className="shrink-0 text-sm font-medium">
            Four weeks, one roadmap
          </h2>
          <p className="text-2xs text-fg-subtle sm:text-right">
            Solid lines are prerequisites inside a week, dashed lines hand off to the next week.
            Select a topic to list only its problems, or a week&apos;s title to list that week.
          </p>
        </div>
        <RoadmapGraph
          marks={marks}
          selectedPattern={filters.pattern}
          selectedWeek={filters.week}
          today={today}
          onSelectPattern={selectPattern}
          onSelectWeek={selectWeek}
        />
      </section>

      <RoadmapToolbar
        filters={filters}
        onChange={setFilters}
        shown={shown}
        total={ROADMAP_PROBLEMS.length}
      />

      <div ref={listRef} className="flex scroll-mt-40 flex-col gap-8">
        {sections.length === 0 ? (
          <p className="rounded-md border border-border px-4 py-8 text-center text-sm text-fg-muted">
            Nothing matches these filters.
          </p>
        ) : (
          sections.map((s) => (
            <PatternSection
              key={s.code}
              code={s.code}
              rows={s.rows}
              marks={marks}
              onToggle={toggle}
            />
          ))
        )}
      </div>

      <RoadmapKey />
    </div>
  );
}
