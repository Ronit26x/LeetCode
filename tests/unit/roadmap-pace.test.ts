import { describe, expect, it } from "vitest";
import {
  ROADMAP_PLAN,
  ROADMAP_PRACTICE_DAYS,
  ROADMAP_PROBLEMS,
  practiceDaysOf,
  type RoadmapPlan,
} from "@/lib/roadmap/data";
import type { RoadmapMarks } from "@/lib/roadmap/marks";
import { computePace, dayLabel } from "@/lib/roadmap/pace";

const CORE = ROADMAP_PROBLEMS.filter((p) => p.tier === "core");

/** The first problems of `pool` done, `n` of them stamped on each `doneOn` in order. */
function doneMarks(counts: Record<string, number>, pool = CORE): RoadmapMarks {
  const marks: RoadmapMarks = {};
  let i = 0;
  for (const [doneOn, n] of Object.entries(counts))
    for (let k = 0; k < n; k++) marks[pool[i++].number] = { status: "done", doneOn };
  return marks;
}

/** The live shape when the start moved to Oct 22: 117 done before it, 300 left. Core only, to keep the arithmetic plain. */
const HEAD = {
  "2026-10-12": 18,
  "2026-10-13": 7,
  "2026-10-14": 15,
  "2026-10-15": 52,
  "2026-10-20": 17,
  "2026-10-21": 8,
};

const goal = (
  marks: RoadmapMarks,
  today: string,
  key: "core" | "plus" | "all",
  plan: RoadmapPlan = ROADMAP_PLAN,
) => computePace(marks, today, plan).goals.find((g) => g.key === key)!;

/** The plan before the revisions: every tier spread evenly over Oct 14 to Nov 10. */
const EVEN: RoadmapPlan = { ...ROADMAP_PLAN, start: "2026-10-14", perDay: null };

describe("roadmap pace", () => {
  it("is 15 a day from Oct 22 to Nov 10 with no off day and no taper", () => {
    expect(ROADMAP_PLAN.start).toBe("2026-10-22");
    expect(ROADMAP_PLAN.end).toBe("2026-11-10");
    expect(ROADMAP_PLAN.perDay).toBe(15);
    expect(ROADMAP_PLAN.offDays).toEqual([]);
    expect(ROADMAP_PRACTICE_DAYS).toHaveLength(20);
    expect(ROADMAP_PRACTICE_DAYS[0]).toBe("2026-10-22");
    expect(ROADMAP_PRACTICE_DAYS.at(-1)).toBe("2026-11-10");
    expect(dayLabel(ROADMAP_PLAN.start)).toBe("Thu Oct 22");
    expect(dayLabel(ROADMAP_PLAN.interview)).toBe("Thu Nov 12");
  });

  it("before the plan starts nothing has elapsed, earlier marks are the head start, every goal is a full-plan rate", () => {
    const pace = computePace(doneMarks(HEAD), "2026-10-21");
    expect(pace.elapsed).toBe(0);
    expect(pace.left).toBe(20);
    expect(pace.offDay).toBe(false);
    expect(pace.avgPerDay).toBeNull();
    expect(pace.done).toBe(117);
    expect(pace.quota).toBe(15);
    expect(pace.summary).toContain(
      "Practice runs Thu Oct 22 to Tue Nov 10: 20 days at 15 a day, then the interview Thu Nov 12. 117 done before the start, where the plan line begins.",
    );
    expect(pace.summary).not.toContain("taper");
    expect(computePace({}, "2026-10-21").summary).not.toContain("before the start");
    const all = pace.goals.find((g) => g.key === "all")!;
    expect(all.total).toBe(417);
    expect(all.expected).toBe(117);
    expect(all.perDay).toBeCloseTo(300 / 20, 5);
    expect(all.verdict).toEqual({ kind: "not-started", text: "Starts Thu Oct 22" });
    expect(pace.goals.find((g) => g.key === "core")!.expected).toBe(117);
  });

  it("owes the quota in the morning and is on track once it is done", () => {
    // Day 1 with 117 done before: everything is at 117 + 15 = 132 by the end of the day.
    const morning = goal(doneMarks(HEAD), "2026-10-22", "all");
    expect(morning.expected).toBe(132);
    expect(morning.verdict).toEqual({ kind: "due", text: "15 to go today" });
    const rest = ROADMAP_PROBLEMS.filter((p) => !(p.number in doneMarks(HEAD)));
    const evening = {
      ...doneMarks(HEAD),
      ...doneMarks({ "2026-10-22": 15 }, rest),
    };
    expect(goal(evening, "2026-10-22", "all").verdict).toEqual({
      kind: "on-track",
      text: "On track",
    });
    const ahead = { ...doneMarks(HEAD), ...doneMarks({ "2026-10-22": 18 }, rest) };
    expect(goal(ahead, "2026-10-22", "all").verdict).toEqual({
      kind: "on-track",
      text: "On track, 3 ahead",
    });
  });

  it("each tier rises with its share of the quota", () => {
    // 300 left at 15 a day is 20 days. Day 1 covers 1 / 20 of what each tier has left, rounded
    // up: core 117 + 5.25 = 123 (6 to go), core and plus 117 + 6.85 = 124 (7 to go).
    const marks = doneMarks(HEAD);
    const core = goal(marks, "2026-10-22", "core");
    expect(core.expected).toBe(123);
    expect(core.verdict).toEqual({ kind: "due", text: "6 to go today" });
    const plus = goal(marks, "2026-10-22", "plus");
    expect(plus.expected).toBe(124);
    expect(plus.verdict).toEqual({ kind: "due", text: "7 to go today" });
    // The needed rate is still what finishes the tier: 105 core over 20 days.
    expect(core.perDay).toBeCloseTo(105 / 20, 5);
  });

  it("rounds what is owed up, so a fraction short is never read as on track", () => {
    // Core needs 105 / 20 = 5.25 a day from a head start of 117. By the end of day 5 the exact
    // line is 117 + 26.25: rounding to nearest would call 26 done on track, rounding up asks for
    // one more. The quota on everything is an exact 15 a day either way.
    const rest = CORE.slice(117);
    const five = { ...doneMarks(HEAD), ...doneMarks({ "2026-10-25": 26 }, rest) };
    const day5 = goal(five, "2026-10-26", "core");
    expect(day5.expected).toBe(144);
    expect(day5.verdict).toEqual({ kind: "due", text: "1 to go today" });
    const done = { ...doneMarks(HEAD), ...doneMarks({ "2026-10-25": 27 }, rest) };
    expect(goal(done, "2026-10-26", "core").verdict).toEqual({
      kind: "on-track",
      text: "On track",
    });
    expect(goal(doneMarks(HEAD), "2026-10-22", "all").verdict.text).toBe("15 to go today");
    // The needed rate keeps its decimals.
    expect(goal(doneMarks(HEAD), "2026-10-22", "core").perDay).toBeCloseTo(105 / 20, 5);
  });

  it("the line on everything climbs exactly the quota a day and caps at the total", () => {
    const marks = doneMarks(HEAD);
    expect(goal(marks, "2026-10-31", "all").expected).toBe(117 + 150); // day 10
    expect(goal(marks, "2026-11-09", "all").expected).toBe(117 + 285); // day 19
    expect(goal(marks, "2026-11-10", "all").expected).toBe(417); // day 20: the last 15
    const rest = ROADMAP_PROBLEMS.filter((p) => !(p.number in marks));
    const lastMorning = { ...marks, ...doneMarks({ "2026-11-09": 285 }, rest) };
    expect(goal(lastMorning, "2026-11-10", "all").verdict).toEqual({
      kind: "due",
      text: "15 to go today",
    });
  });

  it("a strong first day only carries as far as the line has moved", () => {
    // 20 on day one and 5 on day two is 142 against a line of 147: 5 to go, within the day's
    // 15. The same 20 alone on day three (line 162) owes 25, more than the share, so it is behind.
    const rest = ROADMAP_PROBLEMS.filter((p) => !(p.number in doneMarks(HEAD)));
    const two = { ...doneMarks(HEAD), ...doneMarks({ "2026-10-22": 20, "2026-10-23": 5 }, rest) };
    expect(goal(two, "2026-10-23", "all").verdict).toEqual({ kind: "due", text: "5 to go today" });
    const one = { ...doneMarks(HEAD), ...doneMarks({ "2026-10-22": 20 }, rest) };
    expect(goal(one, "2026-10-24", "all").verdict).toEqual({
      kind: "behind",
      text: "Behind: 25 to go today",
    });
  });

  it("averages over the finished days of the plan and counts today as available", () => {
    const rest = ROADMAP_PROBLEMS.filter((p) => !(p.number in doneMarks(HEAD)));
    const marks = { ...doneMarks(HEAD), ...doneMarks({ "2026-10-22": 10, "2026-10-23": 2 }, rest) };
    const pace = computePace(marks, "2026-10-23");
    expect(pace.elapsed).toBe(2);
    expect(pace.left).toBe(18);
    expect(pace.done).toBe(129);
    expect(pace.doneToday).toBe(2);
    expect(pace.avgPerDay).toBe(10);
    expect(pace.summary).toBe(
      "Day 2 of 20 at 15 a day · 129 done (2 today) · 10.0 a day before today · practice ends Tue Nov 10, then the interview Thu Nov 12",
    );
    // 288 left with 2 of them done today: the rate the day started with, 290 over 19 days.
    expect(pace.goals.find((g) => g.key === "all")!.perDay).toBeCloseTo(290 / 19, 5);
    expect(computePace(doneMarks(HEAD), "2026-10-22").avgPerDay).toBeNull();
  });

  it("the needed rate holds through the day and only moves at the day boundary", () => {
    const rest = ROADMAP_PROBLEMS.filter((p) => !(p.number in doneMarks(HEAD)));
    const morning = goal(doneMarks(HEAD), "2026-10-22", "all");
    const fifteen = { ...doneMarks(HEAD), ...doneMarks({ "2026-10-22": 15 }, rest) };
    const evening = goal(fifteen, "2026-10-22", "all");
    expect(morning.perDay).toBeCloseTo(300 / 20, 5);
    expect(evening.perDay).toBe(morning.perDay);
    expect(evening.remaining).toBe(285);
    expect(goal(fifteen, "2026-10-23", "all").perDay).toBeCloseTo(285 / 19, 5);
    // Marks made before the start are not a day's work: they lower the rate straight away.
    expect(goal(doneMarks({ "2026-10-21": 15 }), "2026-10-21", "all").perDay).toBeCloseTo(
      402 / 20,
      5,
    );
  });

  it("without a quota each tier is spread evenly over the practice days", () => {
    expect(practiceDaysOf(EVEN)).toHaveLength(28);
    // Day 2: the core line is at ceil(222 * 2 / 28) = 16, today's share is 16 - 8 = 8.
    const morning = goal(doneMarks({ "2026-10-14": 8 }), "2026-10-15", "core", EVEN);
    expect(morning.expected).toBe(16);
    expect(morning.verdict).toEqual({ kind: "due", text: "8 to go today" });
    // 25 before Oct 14 and 8 on day 1: everything needs (417 - 25) / 28 = 14 a day, so the
    // line is at 25 + 14 = 39 by the end of day 1 and 6 are still to go today.
    const all = goal(doneMarks({ "2026-10-12": 25, "2026-10-14": 8 }), "2026-10-14", "all", EVEN);
    expect(all.expected).toBe(39);
    expect(all.perDay).toBeCloseTo(392 / 28, 5);
    expect(all.verdict).toEqual({ kind: "due", text: "6 to go today" });
    const pace = computePace(doneMarks({ "2026-10-14": 8 }), "2026-10-15", EVEN);
    expect(pace.quota).toBeNull();
    expect(pace.summary).toContain("Day 2 of 28 · 8 done (0 today)");
    expect(computePace({}, "2026-10-13", EVEN).summary).toContain(
      "Practice runs Wed Oct 14 to Tue Nov 10: 28 days, then the interview Thu Nov 12.",
    );
  });

  it("a done mark with no day on record is part of the head start", () => {
    const undated: RoadmapMarks = {
      ...doneMarks(HEAD),
      [ROADMAP_PROBLEMS.at(-1)!.number]: { status: "done", doneOn: null },
    };
    // 118 before the start, 299 left: day 1 is 118 + 15 = 133.
    expect(goal(undated, "2026-10-22", "all").expected).toBe(133);
  });

  it("an off day, when the plan lists one, owes nothing and does not move the line", () => {
    const plan = { ...ROADMAP_PLAN, offDays: ["2026-10-25"] };
    expect(practiceDaysOf(plan)).toHaveLength(19);
    expect(practiceDaysOf(plan)).not.toContain("2026-10-25");
    const rest = ROADMAP_PROBLEMS.filter((p) => !(p.number in doneMarks(HEAD)));
    const marks = {
      ...doneMarks(HEAD),
      ...doneMarks({ "2026-10-22": 15, "2026-10-23": 15, "2026-10-24": 15 }, rest),
    };
    const sat = computePace(marks, "2026-10-24", plan);
    const sun = computePace(marks, "2026-10-25", plan);
    const mon = computePace(marks, "2026-10-26", plan);
    expect(sat.elapsed).toBe(3);
    expect(sun.elapsed).toBe(3);
    expect(sun.offDay).toBe(true);
    expect(sun.left).toBe(16);
    expect(sun.avgPerDay).toBe(15);
    expect(sun.summary).toContain(
      "Sun Oct 25 is an off day · 162 done after 3 of 19 days at 15 a day · 15.0 a day so far",
    );
    expect(sat.summary).toContain("Sun Oct 25 off");
    expect(computePace({}, "2026-10-21", plan).summary).toContain(
      "19 days at 15 a day, with Sun Oct 25 off",
    );
    const all = (p: ReturnType<typeof computePace>) => p.goals.find((g) => g.key === "all")!;
    expect(all(sun).expected).toBe(all(sat).expected);
    expect(all(sun).expected).toBe(162);
    expect(all(sun).verdict).toEqual({ kind: "on-track", text: "On track" });
    expect(all(sun).perDay).toBeCloseTo((417 - 162) / 16, 5);
    expect(mon.elapsed).toBe(4);
    expect(all(mon).expected).toBe(177);
    const short = goal(doneMarks(HEAD), "2026-10-25", "all", plan);
    expect(short.verdict).toEqual({ kind: "behind", text: "45 behind" });
  });

  it("marks a finished goal done and caps the plan line", () => {
    const all: RoadmapMarks = {};
    for (const p of ROADMAP_PROBLEMS) all[p.number] = { status: "done", doneOn: "2026-10-22" };
    const pace = computePace(all, "2026-10-22");
    for (const g of pace.goals) {
      expect(g.verdict.kind).toBe("done");
      expect(g.expected).toBeLessThanOrEqual(g.total);
      expect(g.remaining).toBe(0);
    }
  });

  it("after the end date the window is spent", () => {
    const pace = computePace(doneMarks({ "2026-11-01": 5 }), "2026-11-11");
    expect(pace.elapsed).toBe(20);
    expect(pace.left).toBe(0);
    expect(pace.offDay).toBe(false);
    expect(pace.summary).toBe(
      "Practice ended Tue Nov 10 with 5 done. The interview is Thu Nov 12.",
    );
    // No head start: 20 days at 15 cover 300 of 417, so the line ends at that share of core.
    expect(pace.goals[0].expected).toBe(Math.ceil((222 * 300) / 417));
    expect(pace.goals[0].perDay).toBeNull();
    expect(pace.goals[0].verdict).toEqual({ kind: "behind", text: "Ended 217 short" });
  });
});
