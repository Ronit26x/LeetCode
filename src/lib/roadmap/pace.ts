import { ROADMAP_PLAN, ROADMAP_PROBLEMS, type RoadmapProblem } from "./data";
import type { RoadmapMarks } from "./marks";

export type PaceVerdictKind = "done" | "not-started" | "on-track" | "close" | "off-pace";

export interface PaceGoal {
  key: "core" | "plus" | "all";
  label: string;
  total: number;
  done: number;
  remaining: number;
  /** Problems a day needed from today to finish by the end of practice; null when no day is left. */
  perDay: number | null;
  /** Where the current average lands by the end of practice, capped at the goal. */
  projected: number;
  verdict: { kind: PaceVerdictKind; text: string };
}

export interface Pace {
  /** Days of practice elapsed including today, 0 before the plan starts, capped at the plan length. */
  elapsed: number;
  /** Full days left after today. */
  left: number;
  done: number;
  doneToday: number;
  avgPerDay: number;
  projected: number;
  summary: string;
  goals: PaceGoal[];
}

/** Whole days since the epoch for a YYYY-MM-DD string, so two dates subtract to a day count. */
function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

const GOALS: { key: PaceGoal["key"]; label: string; pick: (p: RoadmapProblem) => boolean }[] = [
  { key: "core", label: "Core plan", pick: (p) => p.tier === "core" },
  { key: "plus", label: "Core and plus", pick: (p) => p.tier !== "stretch" },
  { key: "all", label: "Everything", pick: () => true },
];

/** Pure. `today` is the review day (dayStartHour in the user's zone), YYYY-MM-DD. */
export function computePace(marks: RoadmapMarks, today: string): Pace {
  const total = ROADMAP_PLAN.totalDays;
  const sinceStart = dayNumber(today) - dayNumber(ROADMAP_PLAN.start) + 1;
  const elapsed = Math.max(0, Math.min(total, sinceStart));
  const left = Math.max(0, total - elapsed);
  const ended = dayNumber(today) > dayNumber(ROADMAP_PLAN.end);
  const isDone = (p: RoadmapProblem) => marks[p.number]?.status === "done";
  const done = ROADMAP_PROBLEMS.filter(isDone).length;
  const doneToday = ROADMAP_PROBLEMS.filter(
    (p) => isDone(p) && marks[p.number]?.doneOn === today,
  ).length;
  const avgPerDay = elapsed ? done / elapsed : 0;
  const projected = Math.round(done + avgPerDay * left);

  let summary: string;
  if (elapsed === 0) {
    summary = `Practice runs Mon Oct 12 to Tue ${ROADMAP_PLAN.endLabel} (${total} days), then a taper ${ROADMAP_PLAN.taperLabel} and the interview ${ROADMAP_PLAN.interviewLabel}. Mark problems done as you finish them and this projects where you will land.`;
  } else if (ended) {
    summary = `Practice ended ${ROADMAP_PLAN.endLabel} with ${done} done. The taper ${ROADMAP_PLAN.taperLabel} is for redos, review and mocks, then the interview ${ROADMAP_PLAN.interviewLabel}.`;
  } else {
    summary = `Day ${elapsed} of ${total} · ${done} done (${doneToday} today) · average ${avgPerDay.toFixed(1)} a day · at this pace you finish about ${projected} by ${ROADMAP_PLAN.endLabel}. The taper ${ROADMAP_PLAN.taperLabel} is kept for redos, review and mocks.`;
  }

  const goals = GOALS.map(({ key, label, pick }): PaceGoal => {
    const set = ROADMAP_PROBLEMS.filter(pick);
    const n = set.length;
    const d = set.filter(isDone).length;
    const remaining = n - d;
    // Today still counts as a working day until something is marked done on it; after the end
    // date no day is left at all.
    const daysAvailable = ended ? 0 : left + (doneToday ? 0 : 1);
    const perDay = elapsed === 0 ? n / total : daysAvailable > 0 ? remaining / daysAvailable : null;
    const projectedHere = Math.min(n, projected);
    let verdict: PaceGoal["verdict"];
    if (remaining <= 0) verdict = { kind: "done", text: "Done" };
    else if (elapsed === 0) verdict = { kind: "not-started", text: "Starts Mon Oct 12" };
    else if (projected >= n) verdict = { kind: "on-track", text: "On track" };
    else if (projected >= n * 0.85)
      verdict = { kind: "close", text: `Close: about ${n - projected} short` };
    else verdict = { kind: "off-pace", text: `Off pace: about ${n - projected} short` };
    return { key, label, total: n, done: d, remaining, perDay, projected: projectedHere, verdict };
  });

  return { elapsed, left, done, doneToday, avgPerDay, projected, summary, goals };
}
