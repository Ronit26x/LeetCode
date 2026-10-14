import {
  ROADMAP_PLAN,
  ROADMAP_PROBLEMS,
  practiceDaysOf,
  type RoadmapPlan,
  type RoadmapProblem,
} from "./data";
import type { RoadmapMarks } from "./marks";

/**
 * done: nothing left. not-started: before the plan. on-track: at or past the plan line.
 * due: short by at most today's share, so a normal day gets back on track. behind: short by more
 * than today's share (or short at all on an off day, or after the end).
 */
export type PaceVerdictKind = "done" | "not-started" | "on-track" | "due" | "behind";

export interface PaceGoal {
  key: "core" | "plus" | "all";
  label: string;
  total: number;
  done: number;
  remaining: number;
  /** Where the plan line is by the end of today; on an off day, by the end of the last practice day. */
  expected: number;
  /** Problems a day needed from today to finish by the end of practice; null when no day is left. */
  perDay: number | null;
  verdict: { kind: PaceVerdictKind; text: string };
}

export interface Pace {
  /** Practice days elapsed including today, 0 before the plan starts, capped at the plan length. An off day counts the practice days before it. */
  elapsed: number;
  /** Practice days left after today. */
  left: number;
  /** Today is inside the window but has nothing planned. */
  offDay: boolean;
  done: number;
  doneToday: number;
  /** Average over the practice days before today, which is still being worked. Null on day 1. */
  avgPerDay: number | null;
  summary: string;
  goals: PaceGoal[];
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Tue Nov 10" for a YYYY-MM-DD string. */
export function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${MON[m - 1]} ${d}`;
}

const GOALS: { key: PaceGoal["key"]; label: string; pick: (p: RoadmapProblem) => boolean }[] = [
  { key: "core", label: "Core plan", pick: (p) => p.tier === "core" },
  { key: "plus", label: "Core and plus", pick: (p) => p.tier !== "stretch" },
  { key: "all", label: "Everything", pick: () => true },
];

/**
 * Pure. `today` is the review day (dayStartHour in the user's zone), YYYY-MM-DD.
 *
 * Each goal is spread evenly over the practice days, and the verdict compares Done marks with
 * that plan line at the end of today. A strong first day never carries a weak one: the line only
 * moves one day's share at a time, so "on track" means the work up to and including today is
 * done, and "to go today" is exactly what gets back on it.
 */
export function computePace(
  marks: RoadmapMarks,
  today: string,
  plan: RoadmapPlan = ROADMAP_PLAN,
): Pace {
  const days = practiceDaysOf(plan);
  const total = days.length;
  const elapsed = days.filter((d) => d <= today).length;
  const left = total - elapsed;
  const ended = today > plan.end;
  const practiceToday = days.includes(today);
  const offDay = today >= plan.start && !ended && !practiceToday;
  const START = dayLabel(plan.start);
  const END = dayLabel(plan.end);
  const INTERVIEW = dayLabel(plan.interview);
  const isDone = (p: RoadmapProblem) => marks[p.number]?.status === "done";
  const done = ROADMAP_PROBLEMS.filter(isDone).length;
  const doneToday = ROADMAP_PROBLEMS.filter(
    (p) => isDone(p) && marks[p.number]?.doneOn === today,
  ).length;
  // Today is still being worked (unless it is an off day), so the average covers the days before it.
  const finishedDays = offDay || ended ? elapsed : elapsed - 1;
  const avgPerDay = finishedDays > 0 ? (done - doneToday) / finishedDays : null;
  const nextOff = plan.offDays.find((d) => d > today && d <= plan.end);

  let summary: string;
  if (elapsed === 0) {
    const off = plan.offDays.length ? `, with ${plan.offDays.map(dayLabel).join(", ")} off` : "";
    const head = done ? ` ${done} done before the start, counted from day 1.` : "";
    summary = `Practice runs ${START} to ${END}: ${total} days${off}, then the interview ${INTERVIEW}.${head} Mark problems done as you finish them and each goal shows where you stand against the plan.`;
  } else if (ended) {
    summary = `Practice ended ${END} with ${done} done. The interview is ${INTERVIEW}.`;
  } else {
    const parts = offDay
      ? [`${dayLabel(today)} is an off day`, `${done} done after ${elapsed} of ${total} days`]
      : [`Day ${elapsed} of ${total}`, `${done} done (${doneToday} today)`];
    if (avgPerDay !== null)
      parts.push(`${avgPerDay.toFixed(1)} a day${offDay ? " so far" : " before today"}`);
    if (nextOff) parts.push(`${dayLabel(nextOff)} off`);
    parts.push(`practice ends ${END}, then the interview ${INTERVIEW}`);
    summary = parts.join(" · ");
  }

  const goals = GOALS.map(({ key, label, pick }): PaceGoal => {
    const set = ROADMAP_PROBLEMS.filter(pick);
    const n = set.length;
    const d = set.filter(isDone).length;
    const remaining = n - d;
    const planAt = (days: number) => Math.round((n * days) / total);
    const expected = planAt(elapsed);
    const todayShare = offDay ? 0 : expected - planAt(elapsed - 1);
    const behind = expected - d;
    // Today is available while it is a practice day; before the start and on off days it is not.
    const daysAvailable = ended ? 0 : left + (practiceToday ? 1 : 0);
    const perDay = daysAvailable > 0 ? remaining / daysAvailable : null;
    let verdict: PaceGoal["verdict"];
    if (remaining <= 0) verdict = { kind: "done", text: "Done" };
    else if (elapsed === 0) verdict = { kind: "not-started", text: `Starts ${START}` };
    else if (ended) verdict = { kind: "behind", text: `Ended ${remaining} short` };
    else if (behind < 0) verdict = { kind: "on-track", text: `On track, ${-behind} ahead` };
    else if (behind === 0) verdict = { kind: "on-track", text: "On track" };
    else if (offDay) verdict = { kind: "behind", text: `${behind} behind` };
    else if (behind <= todayShare) verdict = { kind: "due", text: `${behind} to go today` };
    else verdict = { kind: "behind", text: `Behind: ${behind} to go today` };
    return { key, label, total: n, done: d, remaining, expected, perDay, verdict };
  });

  return { elapsed, left, offDay, done, doneToday, avgPerDay, summary, goals };
}
