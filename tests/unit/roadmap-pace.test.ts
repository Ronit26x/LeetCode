import { describe, expect, it } from "vitest";
import { ROADMAP_PROBLEMS } from "@/lib/roadmap/data";
import type { RoadmapMarks } from "@/lib/roadmap/marks";
import { computePace } from "@/lib/roadmap/pace";

function doneMarks(n: number, doneOn: string): RoadmapMarks {
  const marks: RoadmapMarks = {};
  for (const p of ROADMAP_PROBLEMS.filter((p) => p.tier === "core").slice(0, n))
    marks[p.number] = { status: "done", doneOn };
  return marks;
}

describe("roadmap pace", () => {
  it("before the plan starts nothing has elapsed and every goal is a full-plan rate", () => {
    const pace = computePace({}, "2026-10-11");
    expect(pace.elapsed).toBe(0);
    expect(pace.left).toBe(23);
    expect(pace.summary).toContain("Practice runs");
    const core = pace.goals.find((g) => g.key === "core")!;
    expect(core.total).toBe(218);
    expect(core.perDay).toBeCloseTo(218 / 23, 5);
    expect(core.verdict.kind).toBe("not-started");
  });

  it("projects the running average over the days left", () => {
    const pace = computePace(doneMarks(10, "2026-10-12"), "2026-10-12");
    expect(pace.elapsed).toBe(1);
    expect(pace.left).toBe(22);
    expect(pace.done).toBe(10);
    expect(pace.doneToday).toBe(10);
    expect(pace.avgPerDay).toBe(10);
    expect(pace.projected).toBe(230);
    const [core, plus, all] = pace.goals;
    expect(core.verdict.kind).toBe("on-track");
    // 208 left over 22 days: today already counts as used because something was done on it.
    expect(core.perDay).toBeCloseTo(208 / 22, 5);
    expect(plus.verdict.kind).toBe("close");
    expect(all.verdict.kind).toBe("off-pace");
    expect(all.verdict.text).toBe("Off pace: about 183 short");
    expect(pace.summary).toContain("Day 1 of 23");
  });

  it("counts today as available when nothing was done on it yet", () => {
    const pace = computePace(doneMarks(10, "2026-10-12"), "2026-10-13");
    expect(pace.doneToday).toBe(0);
    const core = pace.goals[0];
    expect(core.perDay).toBeCloseTo(208 / 22, 5);
  });

  it("marks a finished goal done and caps the projection", () => {
    const all: RoadmapMarks = {};
    for (const p of ROADMAP_PROBLEMS) all[p.number] = { status: "done", doneOn: "2026-10-20" };
    const pace = computePace(all, "2026-10-20");
    for (const g of pace.goals) {
      expect(g.verdict.kind).toBe("done");
      expect(g.projected).toBe(g.total);
      expect(g.remaining).toBe(0);
    }
  });

  it("after the end date the window is spent", () => {
    const pace = computePace(doneMarks(5, "2026-11-01"), "2026-11-05");
    expect(pace.elapsed).toBe(23);
    expect(pace.left).toBe(0);
    expect(pace.summary).toContain("Practice ended");
    expect(pace.goals[0].perDay).toBeNull();
    expect(pace.goals[0].verdict.kind).toBe("off-pace");
  });
});
