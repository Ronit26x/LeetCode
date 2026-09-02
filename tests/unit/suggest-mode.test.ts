import { describe, expect, it } from "vitest";
import { suggestMode, type SuggestLog } from "@/lib/fsrs/suggest-mode";

const settings = { resolveMilestonesDays: [7, 30, 90], resolveAfterNRevises: 3 };
const problem = (tags: { name: string; alwaysResolve: boolean }[] = []) => ({
  reviseCount: 0,
  resolveCount: 1,
  lastMode: "resolve" as const,
  tags,
});
const log = (mode: "revise" | "resolve", rating: number, stability = 0, day = 0): SuggestLog => ({
  mode,
  rating,
  stability,
  reviewedAt: new Date(Date.UTC(2026, 8, 1 + day)),
});

describe("suggestMode", () => {
  it("suggests Resolve on the first review after a struggling first solve", () => {
    expect(suggestMode({ stability: 2, state: 2 }, [log("resolve", 2)], problem(), settings)).toMatchObject({
      mode: "resolve",
    });
    expect(suggestMode({ stability: 1, state: 2 }, [log("resolve", 1)], problem(), settings).mode).toBe(
      "resolve",
    );
  });

  it("suggests Revise after a clean first solve", () => {
    expect(suggestMode({ stability: 3, state: 2 }, [log("resolve", 3)], problem(), settings).mode).toBe(
      "revise",
    );
  });

  it("suggests Resolve when the last grade was Again", () => {
    const logs = [log("resolve", 3), log("revise", 3, 3, 3), log("revise", 1, 8, 10)];
    expect(suggestMode({ stability: 2, state: 2 }, logs, problem(), settings)).toMatchObject({
      mode: "resolve",
      reason: "Last grade was Again",
    });
  });

  it("suggests Resolve when stability crosses a milestone not yet resolved at", () => {
    const logs = [log("resolve", 3), log("revise", 3, 3, 3), log("revise", 3, 6, 9)];
    expect(suggestMode({ stability: 12, state: 2 }, logs, problem(), settings)).toMatchObject({
      mode: "resolve",
      reason: "Stability crossed 7d",
    });
  });

  it("does not repeat a milestone that was already resolved at", () => {
    const logs = [log("resolve", 3), log("revise", 3, 3, 3), log("resolve", 3, 9, 12)];
    expect(suggestMode({ stability: 20, state: 2 }, logs, problem(), settings).mode).toBe("revise");
    // but the next milestone still fires
    expect(suggestMode({ stability: 35, state: 2 }, logs, problem(), settings)).toMatchObject({
      mode: "resolve",
      reason: "Stability crossed 30d",
    });
  });

  it("suggests Resolve after N consecutive revises since the last resolve", () => {
    const logs = [
      log("resolve", 3, 0, 0),
      log("revise", 3, 3, 3),
      log("revise", 3, 6, 6),
      log("revise", 3, 6.5, 12),
    ];
    // stability below the first milestone so only the streak rule can fire
    expect(suggestMode({ stability: 6.9, state: 2 }, logs, problem(), settings)).toMatchObject({
      mode: "resolve",
      reason: "3 revises since the last resolve",
    });
    expect(suggestMode({ stability: 6.9, state: 2 }, logs.slice(0, 3), problem(), settings).mode).toBe(
      "revise",
    );
  });

  it("suggests Resolve for a tag marked always resolve", () => {
    const logs = [log("resolve", 3)];
    expect(
      suggestMode({ stability: 3, state: 2 }, logs, problem([{ name: "Graphs", alwaysResolve: true }]), settings),
    ).toMatchObject({ mode: "resolve", reason: "Graphs is always resolved" });
  });

  it("ignores manual (reset) logs", () => {
    const logs = [log("resolve", 3), log("revise", 0, 5, 4)];
    expect(suggestMode({ stability: 3, state: 2 }, logs, problem(), settings).mode).toBe("revise");
  });
});
