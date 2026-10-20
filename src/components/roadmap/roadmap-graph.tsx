"use client";

import * as React from "react";
import {
  PATTERN_CODES,
  PATTERNS,
  ROADMAP_EDGES,
  ROADMAP_HANDOFFS,
  ROADMAP_LAYERS,
  ROADMAP_WEEKS,
  type PatternCode,
  type RoadmapWeek,
  type WeekNumber,
} from "@/lib/roadmap/data";
import { edgePath, layoutRoadmap } from "@/lib/roadmap/layout";
import {
  completePatterns,
  patternProgress,
  weekProgress,
  type RoadmapMarks,
  type RoadmapProgress,
} from "@/lib/roadmap/marks";
import { cn } from "@/lib/utils";

const NODE_W = 168;
const NODE_H = 60;
const HEADER = 68;
const PAD_X = 20;
const LAYOUT = layoutRoadmap({
  width: 1120,
  nodeWidth: NODE_W,
  nodeHeight: NODE_H,
  gap: 20,
  layerGap: 104,
  headerHeight: HEADER,
  bandPadBottom: 20,
  bandGap: 44,
  margin: 24,
});
const W = LAYOUT.width;

interface GraphProps {
  marks: RoadmapMarks;
  selectedPattern: "" | PatternCode;
  selectedWeek: 0 | WeekNumber;
  /** YYYY-MM-DD in the user's zone; marks the current week. */
  today: string;
  onSelectPattern: (code: PatternCode) => void;
  onSelectWeek: (week: WeekNumber) => void;
}

function pressKey(fn: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };
}

function isCurrent(w: RoadmapWeek, today: string) {
  return today >= w.start && today <= w.end;
}

/**
 * Desktop: one SVG, four week bands stacked top to bottom, each topic a node with its own progress
 * bar, solid edges for prerequisites inside a week and dashed hand-offs across the band gap.
 */
function GraphSvg({
  marks,
  selectedPattern,
  selectedWeek,
  today,
  onSelectPattern,
  onSelectWeek,
}: GraphProps) {
  const touches = (a: PatternCode, b: PatternCode) =>
    selectedPattern !== "" && (selectedPattern === a || selectedPattern === b);
  const inWeek = (code: PatternCode) =>
    selectedWeek === 0 || LAYOUT.nodes[code].week === selectedWeek;
  const complete = completePatterns(marks);
  // An edge whose two patterns are both complete takes the completed outline's green and a
  // heavier stroke: finishing a topic colors the lines around it.
  const done = (a: PatternCode, b: PatternCode) => complete.has(a) && complete.has(b);
  const edgeClass = (a: PatternCode, b: PatternCode) =>
    cn(
      "transition-opacity duration-150",
      touches(a, b) ? "stroke-primary" : done(a, b) ? "stroke-good" : "stroke-border-strong",
      !inWeek(a) && !inWeek(b) && "opacity-40",
    );
  const edgeWidth = (a: PatternCode, b: PatternCode) =>
    done(a, b) ? 2.5 : touches(a, b) ? 2 : 1.5;
  // Week titles get a background-colored halo so a hand-off passing behind them stays legible.
  const halo = "stroke-background [paint-order:stroke]";

  return (
    <svg
      viewBox={`0 0 ${W} ${LAYOUT.height}`}
      className="block h-auto w-full min-w-[1000px]"
      role="group"
      aria-label="Week-by-week pattern roadmap"
    >
      <g fill="none">
        {ROADMAP_HANDOFFS.map(([a, b]) => (
          <path
            key={`${a}-${b}`}
            d={edgePath(LAYOUT.nodes[a], LAYOUT.nodes[b], NODE_H)}
            strokeDasharray="4 4"
            strokeLinecap="round"
            className={edgeClass(a, b)}
            strokeWidth={edgeWidth(a, b)}
          />
        ))}
      </g>

      {ROADMAP_WEEKS.map((w) => {
        const band = LAYOUT.bands[w.n - 1];
        const prog = weekProgress(w.n, marks);
        const selected = selectedWeek === w.n;
        const dim = selectedWeek !== 0 && !selected;
        const barW = W - 2 * PAD_X;
        const select = () => onSelectWeek(w.n);
        return (
          <g key={w.n} className={cn("transition-opacity duration-150", dim && "opacity-40")}>
            <rect
              x={1}
              y={band.top}
              width={W - 2}
              height={band.height}
              rx={10}
              fill="none"
              className={selected ? "stroke-primary" : "stroke-border"}
              strokeWidth={selected ? 2 : 1}
            />
            <g
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              className="group/week cursor-pointer outline-none"
              onClick={select}
              onKeyDown={pressKey(select)}
            >
              <rect
                x={1}
                y={band.top}
                width={W - 2}
                height={HEADER - 10}
                rx={10}
                fill="transparent"
              />
              <text
                x={PAD_X}
                y={band.top + 29}
                strokeWidth={5}
                strokeLinejoin="round"
                className={cn("text-[14px] font-semibold", halo)}
              >
                <tspan
                  className={cn(
                    "group-hover/week:fill-primary group-focus-visible/week:fill-primary",
                    selected ? "fill-primary" : "fill-foreground",
                  )}
                >
                  Week {w.n}
                </tspan>
                <tspan dx={12} className="fill-fg-muted text-[12px] font-medium">
                  {w.dates}
                </tspan>
                <tspan dx={12} className="fill-fg-muted text-[13px] font-normal">
                  {w.focus}
                </tspan>
                {isCurrent(w, today) ? (
                  <tspan dx={12} className="fill-fg-subtle text-[12px] font-normal">
                    this week
                  </tspan>
                ) : null}
              </text>
              <text
                x={W - PAD_X}
                y={band.top + 29}
                textAnchor="end"
                strokeWidth={5}
                strokeLinejoin="round"
                className={cn("fill-fg-muted text-[12px] font-medium", halo)}
              >
                {prog.done} / {prog.total} done
              </text>
              <rect
                x={PAD_X}
                y={band.top + 44}
                width={barW}
                height={4}
                rx={2}
                className="fill-sunken"
              />
              {prog.done > 0 ? (
                <rect
                  x={PAD_X}
                  y={band.top + 44}
                  width={Math.max(4, (barW * prog.done) / prog.total)}
                  height={4}
                  rx={2}
                  className="fill-primary"
                />
              ) : null}
            </g>
          </g>
        );
      })}

      <g fill="none">
        {ROADMAP_EDGES.map(([a, b]) => (
          <path
            key={`${a}-${b}`}
            d={edgePath(LAYOUT.nodes[a], LAYOUT.nodes[b], NODE_H)}
            className={edgeClass(a, b)}
            strokeWidth={edgeWidth(a, b)}
          />
        ))}
      </g>

      {PATTERN_CODES.map((code) => {
        const pos = LAYOUT.nodes[code];
        const prog = patternProgress(code, marks);
        const selected = selectedPattern === code;
        const full = complete.has(code);
        const select = () => onSelectPattern(code);
        const barW = NODE_W - 28;
        return (
          <g
            key={code}
            transform={`translate(${pos.x - NODE_W / 2},${pos.y})`}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            className={cn(
              "group/node cursor-pointer transition-opacity duration-150 outline-none",
              !inWeek(code) && "opacity-40",
            )}
            onClick={select}
            onKeyDown={pressKey(select)}
          >
            <rect
              width={NODE_W}
              height={NODE_H}
              rx={6}
              className={cn(
                "group-hover/node:stroke-primary group-focus-visible/node:stroke-primary",
                selected
                  ? "fill-primary/8 stroke-primary"
                  : full
                    ? "fill-surface stroke-good"
                    : "fill-surface stroke-border",
              )}
              strokeWidth={selected ? 2 : 1}
            />
            <text
              x={NODE_W / 2}
              y={23}
              textAnchor="middle"
              className="fill-foreground text-[13px] font-medium"
            >
              {PATTERNS[code].short}
            </text>
            <rect x={14} y={33} width={barW} height={4} rx={2} className="fill-sunken" />
            {prog.done > 0 ? (
              <rect
                x={14}
                y={33}
                width={Math.max(4, (barW * prog.done) / prog.total)}
                height={4}
                rx={2}
                className="fill-primary"
              />
            ) : null}
            <text x={NODE_W / 2} y={51} textAnchor="middle" className="fill-fg-muted text-[11px]">
              {prog.done}/{prog.total} done · {prog.core} core
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Bar({ progress, className }: { progress: RoadmapProgress; className?: string }) {
  const pct = progress.total ? (100 * progress.done) / progress.total : 0;
  return (
    <span className={cn("block h-1 w-full overflow-hidden rounded-sm bg-sunken", className)}>
      {progress.done > 0 ? (
        <span
          className="block h-full rounded-sm bg-primary"
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      ) : null}
    </span>
  );
}

/** Phone: the same weeks and topics as a tappable list, layer order kept, no edges. */
function WeekList({
  marks,
  selectedPattern,
  selectedWeek,
  today,
  onSelectPattern,
  onSelectWeek,
}: GraphProps) {
  return (
    <ol className="flex flex-col gap-3" aria-label="Week-by-week pattern roadmap">
      {ROADMAP_WEEKS.map((w) => {
        const prog = weekProgress(w.n, marks);
        const selected = selectedWeek === w.n;
        const codes = ROADMAP_LAYERS.filter((l) => l.week === w.n).flatMap((l) => l.codes);
        return (
          <li
            key={w.n}
            className={cn(
              "rounded-xl border bg-surface",
              selected ? "border-primary" : "border-border",
            )}
          >
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelectWeek(w.n)}
              className="flex w-full flex-col gap-1.5 rounded-t-xl px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
            >
              <span className="flex w-full items-baseline gap-2">
                <span className={cn("text-sm font-semibold", selected && "text-primary")}>
                  Week {w.n}
                </span>
                <span className="text-2xs text-fg-muted">{w.dates}</span>
                {isCurrent(w, today) ? (
                  <span className="text-2xs text-fg-subtle">this week</span>
                ) : null}
                <span className="ml-auto text-2xs text-fg-muted">
                  {prog.done} / {prog.total} done
                </span>
              </span>
              <span className="text-md text-fg-muted">{w.focus}</span>
              <Bar progress={prog} />
            </button>
            <ol className="grid grid-cols-2 gap-1.5 border-t border-border p-2">
              {codes.map((code) => {
                const p = patternProgress(code, marks);
                const sel = selectedPattern === code;
                const full = p.total > 0 && p.done === p.total;
                return (
                  <li key={code} className="min-w-0">
                    <button
                      type="button"
                      aria-pressed={sel}
                      onClick={() => onSelectPattern(code)}
                      className={cn(
                        "flex min-h-11 w-full flex-col justify-center gap-1.5 rounded-md border px-2.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
                        sel
                          ? "border-primary bg-primary/8"
                          : full
                            ? "border-good bg-background"
                            : "border-border bg-background",
                      )}
                    >
                      <span className="flex w-full items-baseline justify-between gap-2">
                        <span className="truncate text-md font-medium">{PATTERNS[code].short}</span>
                        <span className="shrink-0 text-2xs text-fg-muted">
                          {p.done}/{p.total}
                        </span>
                      </span>
                      <Bar progress={p} />
                    </button>
                  </li>
                );
              })}
            </ol>
          </li>
        );
      })}
    </ol>
  );
}

/** The roadmap: an SVG graph from the md breakpoint up, a list below it. */
export function RoadmapGraph(props: GraphProps) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <GraphSvg {...props} />
      </div>
      <div className="md:hidden">
        <WeekList {...props} />
      </div>
    </>
  );
}
