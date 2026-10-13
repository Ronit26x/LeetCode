import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { freshDb } from "../helpers/db";
import type { Db } from "@/db";
import { cards, problems } from "@/db/schema";

let db: Db;

beforeAll(async () => {
  db = await freshDb();
});

beforeEach(async () => {
  await db.delete(problems);
});

async function cardDueAt(slug: string, due: Date) {
  const [p] = await db.insert(problems).values({ slug, title: slug, status: "active" }).returning();
  await db.insert(cards).values({
    problemId: p.id,
    due,
    state: 2,
    stability: 5,
    scheduledDays: 5,
    reps: 1,
    lastReview: new Date(due.getTime() - 5 * 86_400_000),
  });
}

// Default settings: America/Los_Angeles, review day starts at 9 AM.
describe("the 'due tomorrow' count", () => {
  it("counts only cards due in tomorrow's review day, not the day after", async () => {
    const { getTodayQueue } = await import("@/lib/queue/build");
    const now = new Date("2026-10-13T19:00:00Z"); // Oct 13, 12 PM PDT
    await cardDueAt("today", new Date("2026-10-13T20:00:00Z")); // Oct 13, 1 PM PDT
    await cardDueAt("tomorrow-morning", new Date("2026-10-14T17:00:00Z")); // Oct 14, 10 AM PDT
    await cardDueAt("tomorrow-night", new Date("2026-10-15T05:30:00Z")); // Oct 14, 10:30 PM PDT
    await cardDueAt("tomorrow-before-boundary", new Date("2026-10-15T15:59:00Z")); // Oct 15, 8:59 AM PDT
    await cardDueAt("day-after-at-boundary", new Date("2026-10-15T16:00:00Z")); // Oct 15, 9 AM PDT
    await cardDueAt("day-after-afternoon", new Date("2026-10-15T20:00:00Z")); // Oct 15, 1 PM PDT

    const q = await getTodayQueue(now);
    expect(q.stats.due).toBe(1);
    expect(q.stats.tomorrow).toBe(3);
  });

  it("ends tomorrow at the day-start hour even across the DST fallback (a 25-hour day)", async () => {
    const { getTodayQueue } = await import("@/lib/queue/build");
    // Oct 31 9:00 PDT = 16:00Z; Nov 1 9:00 PST = 17:00Z; Nov 2 9:00 PST = 17:00Z.
    const now = new Date("2026-10-31T20:00:00Z"); // Oct 31, 1 PM PDT
    await cardDueAt("tomorrow-late", new Date("2026-11-02T16:30:00Z")); // Nov 2, 8:30 AM PST
    await cardDueAt("day-after-at-boundary", new Date("2026-11-02T17:00:00Z")); // Nov 2, 9 AM PST
    await cardDueAt("day-after-later", new Date("2026-11-03T00:00:00Z")); // Nov 2, 4 PM PST

    const q = await getTodayQueue(now);
    expect(q.stats.due).toBe(0);
    expect(q.stats.tomorrow).toBe(1);
  });
});
