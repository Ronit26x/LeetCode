import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { freshDb } from "../helpers/db";
import type { Db } from "@/db";
import { cards, problems, reviewLogs, type ProblemStatus } from "@/db/schema";
import { getSettings } from "@/db/bootstrap";
import { reviewDayKey } from "@/lib/day";
import { backlogShiftDays, shiftDue, spreadBacklog } from "@/lib/queue/spread";

let db: Db;
const DAY = 86_400_000;
const TZ = "America/Los_Angeles";

beforeAll(async () => {
  db = await freshDb();
});

beforeEach(async () => {
  await db.delete(problems);
});

async function cardDueAt(slug: string, due: Date, status: ProblemStatus = "active") {
  const [p] = await db.insert(problems).values({ slug, title: slug, status }).returning();
  await db.insert(cards).values({
    problemId: p.id,
    due,
    state: 2,
    stability: 12.5,
    difficulty: 5.1,
    scheduledDays: 7,
    reps: 3,
    lastReview: new Date(due.getTime() - 7 * DAY),
  });
  return p.id;
}

async function dueDayOf(id: string) {
  const row = (await db.query.cards.findFirst({ where: eq(cards.problemId, id) }))!;
  return reviewDayKey(row.due, TZ, 9);
}

describe("backlogShiftDays", () => {
  it("pushes the oldest due review to tomorrow and ignores what is not due yet", () => {
    expect(
      backlogShiftDays(["2026-10-14", "2026-10-18", "2026-10-19", "2026-10-21"], "2026-10-19"),
    ).toBe(6);
    expect(backlogShiftDays(["2026-10-19"], "2026-10-19")).toBe(1);
    expect(backlogShiftDays(["2026-10-20", "2026-10-25"], "2026-10-19")).toBe(0);
    expect(backlogShiftDays([], "2026-10-19")).toBe(0);
  });
});

describe("shiftDue", () => {
  it("keeps the wall-clock time across the November DST change", () => {
    // Oct 28, 9:30 AM PDT is 16:30Z. Six days later is Nov 3, 9:30 AM PST, which is 17:30Z:
    // still after the 9 AM boundary, so review day Nov 3. A flat 144 hours would be 8:30 AM.
    const from = new Date("2026-10-28T16:30:00Z");
    const to = shiftDue(from, 6, TZ);
    expect(to.toISOString()).toBe("2026-11-03T17:30:00.000Z");
    expect(reviewDayKey(to, TZ, 9)).toBe("2026-11-03");
    expect(shiftDue(to, -6, TZ).toISOString()).toBe(from.toISOString());
    expect(shiftDue(new Date("2026-10-14T20:00:00Z"), 6, TZ).toISOString()).toBe(
      "2026-10-20T20:00:00.000Z",
    );
  });
});

// Default settings: America/Los_Angeles, review day starts at 9 AM. Now is Oct 19, 7 PM PDT.
describe("spreadBacklog", () => {
  const now = new Date("2026-10-20T02:00:00Z");

  it("moves every active card by the same number of days, oldest first, and nothing else", async () => {
    const settings = await getSettings();
    const five = await cardDueAt("five-days-overdue", new Date("2026-10-14T20:00:00Z"));
    const four = await cardDueAt("four-days-overdue", new Date("2026-10-16T10:00:00Z")); // 3 AM Oct 16: review day Oct 15
    const today = await cardDueAt("due-today", new Date("2026-10-19T21:00:00Z"));
    const tomorrow = await cardDueAt("due-tomorrow", new Date("2026-10-20T18:00:00Z"));
    const dst = await cardDueAt("across-dst", new Date("2026-10-28T16:30:00Z"));
    const suspended = await cardDueAt("suspended", new Date("2026-10-14T20:00:00Z"), "suspended");
    await db.insert(problems).values({ slug: "no-card", title: "no card", status: "backlog" });

    const dry = await spreadBacklog(db, settings, now, { apply: false });
    expect(dry.today).toBe("2026-10-19");
    expect(dry.shiftDays).toBe(6);
    expect(dry.changed).toBe(0);
    expect(dry.before).toEqual({
      "2026-10-14": 1,
      "2026-10-15": 1,
      "2026-10-19": 1,
      "2026-10-20": 1,
      "2026-10-28": 1,
    });
    expect(dry.after).toEqual({
      "2026-10-20": 1,
      "2026-10-21": 1,
      "2026-10-25": 1,
      "2026-10-26": 1,
      "2026-11-03": 1,
    });
    expect(dry.moves).toHaveLength(5);
    expect(await dueDayOf(five)).toBe("2026-10-14");

    const applied = await spreadBacklog(db, settings, now, { apply: true });
    expect(applied.changed).toBe(5);
    expect(await dueDayOf(five)).toBe("2026-10-20");
    expect(await dueDayOf(four)).toBe("2026-10-21");
    expect(await dueDayOf(today)).toBe("2026-10-25");
    expect(await dueDayOf(tomorrow)).toBe("2026-10-26");
    expect(await dueDayOf(dst)).toBe("2026-11-03");
    expect(await dueDayOf(suspended)).toBe("2026-10-14");
    const row = (await db.query.cards.findFirst({ where: eq(cards.problemId, five) }))!;
    expect(row.stability).toBe(12.5);
    expect(row.difficulty).toBe(5.1);
    expect(row.scheduledDays).toBe(7);
    expect(row.reps).toBe(3);
    expect(row.lastReview?.toISOString()).toBe("2026-10-07T20:00:00.000Z");
    expect(await db.select().from(reviewLogs)).toHaveLength(0);

    // Nothing is due by today any more, so a second run has nothing to spread.
    const again = await spreadBacklog(db, settings, now, { apply: true });
    expect(again.shiftDays).toBe(0);
    expect(again.changed).toBe(0);
    expect(await dueDayOf(five)).toBe("2026-10-20");

    // The same shift negated puts every instant back exactly.
    const undo = await spreadBacklog(db, settings, now, { apply: true, days: -6 });
    expect(undo.changed).toBe(5);
    expect(undo.after).toEqual(dry.before);
    const back = (await db.query.cards.findFirst({ where: eq(cards.problemId, dst) }))!;
    expect(back.due.toISOString()).toBe("2026-10-28T16:30:00.000Z");
  });

  it("is a no-op when nothing is due yet", async () => {
    const settings = await getSettings();
    const id = await cardDueAt("later", new Date("2026-10-22T18:00:00Z"));
    const report = await spreadBacklog(db, settings, now, { apply: true });
    expect(report.shiftDays).toBe(0);
    expect(report.changed).toBe(0);
    expect(report.after).toEqual({ "2026-10-22": 1 });
    expect(await dueDayOf(id)).toBe("2026-10-22");
  });
});
