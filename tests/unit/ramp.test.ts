import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { freshDb } from "../helpers/db";
import type { Db } from "@/db";
import { cards, problems, settings } from "@/db/schema";
import { getSettings } from "@/db/bootstrap";
import { applyFirstSolve } from "@/lib/fsrs/grade";
import { Rating } from "@/lib/fsrs/core";

let db: Db;
const DAY = 86_400_000;

beforeAll(async () => {
  db = await freshDb();
});

describe("retention ramp pass", () => {
  it("shortens long intervals inside the window, never lengthens, and is idempotent per review day", async () => {
    const { applyRetentionRamp } = await import("@/lib/queue/build");
    const now = new Date("2026-09-25T17:00:00Z");
    // Interview in 5 days: inside the 14-day ramp, effective retention above 0.90.
    await db
      .update(settings)
      .set({ interviewDate: "2026-09-30", lastRampAppliedDay: null })
      .where(eq(settings.id, 1));
    const s = await getSettings();
    const [p] = await db.insert(problems).values({ slug: "ramp-card", title: "Ramp" }).returning();
    // A mature card: reviewed 10 days ago with a 60-day interval.
    const lastReview = new Date(now.getTime() - 10 * DAY);
    await db.transaction((tx) => applyFirstSolve(tx, p.id, Rating.Good, lastReview, s));
    const long = new Date(lastReview.getTime() + 60 * DAY);
    await db
      .update(cards)
      .set({ stability: 60, scheduledDays: 60, due: long, state: 2, elapsedDays: 0 })
      .where(eq(cards.problemId, p.id));

    const changed = await applyRetentionRamp(await getSettings(), now);
    expect(changed).toBe(1);
    const after = (await db.query.cards.findFirst({ where: eq(cards.problemId, p.id) }))!;
    expect(after.due.getTime()).toBeLessThan(long.getTime());
    expect(after.due.getTime()).toBeGreaterThan(lastReview.getTime());
    expect(after.scheduledDays).toBeLessThan(60);

    // Same review day: no second pass. A forced re-run changes nothing further.
    expect(await applyRetentionRamp(await getSettings(), now)).toBe(0);
    await db.update(settings).set({ lastRampAppliedDay: null }).where(eq(settings.id, 1));
    expect(await applyRetentionRamp(await getSettings(), now)).toBe(0);
    const again = (await db.query.cards.findFirst({ where: eq(cards.problemId, p.id) }))!;
    expect(again.due.getTime()).toBe(after.due.getTime());
  });

  it("does nothing outside the window or after the interview", async () => {
    const { applyRetentionRamp } = await import("@/lib/queue/build");
    await db
      .update(settings)
      .set({ interviewDate: "2026-12-01", lastRampAppliedDay: null })
      .where(eq(settings.id, 1));
    expect(await applyRetentionRamp(await getSettings(), new Date("2026-09-25T17:00:00Z"))).toBe(0);
    await db
      .update(settings)
      .set({ interviewDate: "2026-09-01", lastRampAppliedDay: null })
      .where(eq(settings.id, 1));
    expect(await applyRetentionRamp(await getSettings(), new Date("2026-09-25T17:00:00Z"))).toBe(0);
  });
});
