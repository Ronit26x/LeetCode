import { describe, expect, it } from "vitest";
import { orderBacklog, solvedAgoLabel, solvedWithinDays } from "@/lib/backlog";

const now = new Date("2026-09-02T18:00:00Z");

describe("solvedAgoLabel", () => {
  it("is exact to the day when the source was", () => {
    expect(solvedAgoLabel("2026-08-30", "day", now)).toBe("3 days ago");
    expect(solvedAgoLabel("2026-09-01", "day", now)).toBe("yesterday");
    expect(solvedAgoLabel("2026-09-02", "day", now)).toBe("today");
  });
  it("says about N months for month precision", () => {
    expect(solvedAgoLabel("2026-01-02", "month", now)).toBe("about 8 months ago");
    expect(solvedAgoLabel("2026-08-05", "month", now)).toBe("about a month ago");
  });
  it("says about a year, N years, or 5+ years for year precision", () => {
    expect(solvedAgoLabel("2025-09-02", "year", now)).toBe("about a year ago");
    expect(solvedAgoLabel("2024-09-02", "year", now)).toBe("about 2 years ago");
    expect(solvedAgoLabel("2021-09-02", "year", now)).toBe("5+ years ago");
  });
  it("returns null without a date", () => {
    expect(solvedAgoLabel(null, null, now)).toBeNull();
  });
});

describe("orderBacklog", () => {
  const items = [
    {
      title: "B warm old",
      tier: "warmup" as const,
      priorSolvedAt: "2021-09-02",
      difficulty: "easy" as const,
      createdAt: new Date(1),
    },
    {
      title: "A core recent",
      tier: "core" as const,
      priorSolvedAt: "2026-08-30",
      difficulty: "medium" as const,
      createdAt: new Date(2),
    },
    {
      title: "C core old",
      tier: "core" as const,
      priorSolvedAt: "2024-09-02",
      difficulty: "hard" as const,
      createdAt: new Date(3),
    },
    {
      title: "D no tier",
      tier: null,
      priorSolvedAt: null,
      difficulty: "easy" as const,
      createdAt: new Date(4),
    },
    {
      title: "E core no prior",
      tier: "core" as const,
      priorSolvedAt: null,
      difficulty: "easy" as const,
      createdAt: new Date(5),
    },
  ];
  it("puts core before warmup and the stalest prior solve first, unknowns last", () => {
    expect(orderBacklog(items).map((i) => i.title)).toEqual([
      "C core old",
      "A core recent",
      "E core no prior",
      "B warm old",
      "D no tier",
    ]);
  });
  it("most recent first", () => {
    expect(
      orderBacklog(items, "recent")
        .map((i) => i.title)
        .slice(0, 2),
    ).toEqual(["A core recent", "C core old"]);
  });
  it("by difficulty then tier then staleness", () => {
    expect(orderBacklog(items, "difficulty").map((i) => i.title)).toEqual([
      "E core no prior",
      "B warm old",
      "D no tier",
      "A core recent",
      "C core old",
    ]);
  });
  it("by title", () => {
    expect(orderBacklog(items, "title").map((i) => i.title)[0]).toBe("A core recent");
  });
});

describe("solvedWithinDays", () => {
  it("includes the boundary and excludes older dates and missing dates", () => {
    expect(solvedWithinDays("2026-08-19", 14, now)).toBe(true);
    expect(solvedWithinDays("2026-08-18", 14, now)).toBe(false);
    expect(solvedWithinDays(null, 14, now)).toBe(false);
  });
});
