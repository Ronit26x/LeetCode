import { describe, expect, it } from "vitest";
import {
  ROADMAP_PLAN,
  ROADMAP_PRACTICE_DAYS,
  ROADMAP_PROBLEMS,
  practiceDaysOf,
} from "@/lib/roadmap/data";
import type { RoadmapMarks } from "@/lib/roadmap/marks";
import { computePace, dayLabel } from "@/lib/roadmap/pace";

/** The first core problems done, `n` of them stamped on each `doneOn` in order. */
function doneMarks(counts: Record<string, number>): RoadmapMarks {
  const marks: RoadmapMarks = {};
  const core = ROADMAP_PROBLEMS.filter((p) => p.tier === "core");
  let i = 0;
  for (const [doneOn, n] of Object.entries(counts))
    for (let k = 0; k < n; k++) marks[core[i++].number] = { status: "done", doneOn };
  return marks;
}

const goal = (marks: RoadmapMarks, today: string, key: "core" | "plus" | "all") =>
  computePace(marks, today).goals.find((g) => g.key === key)!;

describe("roadmap pace", () => {
  it("runs Oct 14 to Nov 10 with no off day and no taper", () => {
    expect(ROADMAP_PLAN.start).toBe("2026-10-14");
    expect(ROADMAP_PLAN.end).toBe("2026-11-10");
    expect(ROADMAP_PLAN.offDays).toEqual([]);
    expect(ROADMAP_PRACTICE_DAYS).toHaveLength(28);
    expect(ROADMAP_PRACTICE_DAYS[0]).toBe("2026-10-14");
    expect(ROADMAP_PRACTICE_DAYS.at(-1)).toBe("2026-11-10");
    expect(dayLabel(ROADMAP_PLAN.start)).toBe("Wed Oct 14");
    expect(dayLabel(ROADMAP_PLAN.interview)).toBe("Thu Nov 12");
  });

  it("before the plan starts nothing has elapsed, earlier marks count, every goal is a full-plan rate", () => {
    const pace = computePace(doneMarks({ "2026-10-12": 3 }), "2026-10-13");
    expect(pace.elapsed).toBe(0);
    expect(pace.left).toBe(28);
    expect(pace.offDay).toBe(false);
    expect(pace.avgPerDay).toBeNull();
    expect(pace.done).toBe(3);
    expect(pace.summary).toContain(
      "Practice runs Wed Oct 14 to Tue Nov 10: 28 days, then the interview Thu Nov 12. 3 done before the start, counted from day 1.",
    );
    expect(pace.summary).not.toContain("taper");
    expect(computePace({}, "2026-10-13").summary).not.toContain("before the start");
    const core = pace.goals.find((g) => g.key === "core")!;
    expect(core.total).toBe(218);
    expect(core.expected).toBe(0);
    expect(core.perDay).toBeCloseTo(215 / 28, 5);
    expect(core.verdict).toEqual({ kind: "not-started", text: "Starts Wed Oct 14" });
  });

  it("owes today's share in the morning and is on track once it is done", () => {
    // Day 2: the core line is at round(218 * 2 / 28) = 16, today's share is 16 - 8 = 8.
    const morning = goal(doneMarks({ "2026-10-14": 8 }), "2026-10-15", "core");
    expect(morning.expected).toBe(16);
    expect(morning.verdict).toEqual({ kind: "due", text: "8 to go today" });
    const evening = goal(doneMarks({ "2026-10-14": 8, "2026-10-15": 8 }), "2026-10-15", "core");
    expect(evening.verdict).toEqual({ kind: "on-track", text: "On track" });
    const ahead = goal(doneMarks({ "2026-10-14": 8, "2026-10-15": 11 }), "2026-10-15", "core");
    expect(ahead.verdict).toEqual({ kind: "on-track", text: "On track, 3 ahead" });
  });

  it("a strong first day only carries as far as the line has moved", () => {
    // 16 on day one and 4 on day two is 20 against a line of 16: on track, 4 ahead. The same 16
    // alone on day three (line 23, share 7) owes exactly today's share, so it is due; on day four
    // (line 31, share 8) it owes 15, more than the share, so it is behind.
    const pace = computePace(doneMarks({ "2026-10-14": 16, "2026-10-15": 4 }), "2026-10-15");
    expect(pace.goals[0].verdict).toEqual({ kind: "on-track", text: "On track, 4 ahead" });
    expect(goal(doneMarks({ "2026-10-14": 16 }), "2026-10-16", "core").verdict).toEqual({
      kind: "due",
      text: "7 to go today",
    });
    expect(goal(doneMarks({ "2026-10-14": 16 }), "2026-10-17", "core").verdict).toEqual({
      kind: "behind",
      text: "Behind: 15 to go today",
    });
  });

  it("averages over the finished days and counts today as available", () => {
    const pace = computePace(doneMarks({ "2026-10-14": 10, "2026-10-15": 2 }), "2026-10-15");
    expect(pace.elapsed).toBe(2);
    expect(pace.left).toBe(26);
    expect(pace.done).toBe(12);
    expect(pace.doneToday).toBe(2);
    expect(pace.avgPerDay).toBe(10);
    expect(pace.summary).toBe(
      "Day 2 of 28 · 12 done (2 today) · 10.0 a day before today · practice ends Tue Nov 10, then the interview Thu Nov 12",
    );
    expect(pace.goals[0].perDay).toBeCloseTo(206 / 27, 5);
    expect(computePace(doneMarks({ "2026-10-14": 3 }), "2026-10-14").avgPerDay).toBeNull();
  });

  it("an off day, when the plan lists one, owes nothing and does not move the line", () => {
    const plan = { ...ROADMAP_PLAN, offDays: ["2026-10-18"] };
    expect(practiceDaysOf(plan)).toHaveLength(27);
    expect(practiceDaysOf(plan)).not.toContain("2026-10-18");
    const marks = doneMarks({ "2026-10-14": 8, "2026-10-15": 8, "2026-10-16": 30 });
    const sat = computePace(marks, "2026-10-17", plan);
    const sun = computePace(marks, "2026-10-18", plan);
    const mon = computePace(marks, "2026-10-19", plan);
    expect(sat.elapsed).toBe(4);
    expect(sun.elapsed).toBe(4);
    expect(sun.offDay).toBe(true);
    expect(sun.left).toBe(23);
    expect(sun.avgPerDay).toBeCloseTo(46 / 4, 5);
    expect(sun.summary).toContain("Sun Oct 18 is an off day · 46 done after 4 of 27 days");
    expect(sat.summary).toContain("Sun Oct 18 off");
    expect(computePace({}, "2026-10-13", plan).summary).toContain("27 days, with Sun Oct 18 off");
    expect(sun.goals[0].expected).toBe(sat.goals[0].expected);
    expect(sun.goals[0].perDay).toBeCloseTo((218 - 46) / 23, 5);
    expect(mon.elapsed).toBe(5);
    expect(mon.goals[0].expected).toBe(Math.round((218 * 5) / 27));
    const short = computePace(doneMarks({ "2026-10-14": 8 }), "2026-10-18", plan).goals[0];
    expect(short.verdict).toEqual({ kind: "behind", text: `${short.expected - 8} behind` });
  });

  it("the plus and all tiers get their own lines", () => {
    // Day 2 lines: plus round(250 * 2 / 28) = 18 (share 9), all round(413 * 2 / 28) = 30 (share 15).
    const marks = doneMarks({ "2026-10-14": 8, "2026-10-15": 8 });
    expect(goal(marks, "2026-10-15", "plus").verdict).toEqual({
      kind: "due",
      text: "2 to go today",
    });
    expect(goal(marks, "2026-10-15", "all").verdict).toEqual({
      kind: "due",
      text: "14 to go today",
    });
    const few = doneMarks({ "2026-10-14": 5 });
    expect(goal(few, "2026-10-15", "core").verdict).toEqual({
      kind: "behind",
      text: "Behind: 11 to go today",
    });
    expect(goal(few, "2026-10-15", "plus").verdict).toEqual({
      kind: "behind",
      text: "Behind: 13 to go today",
    });
    expect(goal(few, "2026-10-15", "all").verdict).toEqual({
      kind: "behind",
      text: "Behind: 25 to go today",
    });
  });

  it("marks a finished goal done and caps the plan line", () => {
    const all: RoadmapMarks = {};
    for (const p of ROADMAP_PROBLEMS) all[p.number] = { status: "done", doneOn: "2026-10-20" };
    const pace = computePace(all, "2026-10-20");
    for (const g of pace.goals) {
      expect(g.verdict.kind).toBe("done");
      expect(g.expected).toBeLessThanOrEqual(g.total);
      expect(g.remaining).toBe(0);
    }
  });

  it("after the end date the window is spent", () => {
    const pace = computePace(doneMarks({ "2026-11-01": 5 }), "2026-11-11");
    expect(pace.elapsed).toBe(28);
    expect(pace.left).toBe(0);
    expect(pace.offDay).toBe(false);
    expect(pace.summary).toBe(
      "Practice ended Tue Nov 10 with 5 done. The interview is Thu Nov 12.",
    );
    expect(pace.goals[0].expected).toBe(218);
    expect(pace.goals[0].perDay).toBeNull();
    expect(pace.goals[0].verdict).toEqual({ kind: "behind", text: "Ended 213 short" });
  });
});
