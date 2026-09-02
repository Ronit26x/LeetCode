import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { freshDb } from "../helpers/db";
import type { Db } from "@/db";
import { cards, problems, reviewLogs } from "@/db/schema";
import { getSettings } from "@/db/bootstrap";
import { applyFirstSolve } from "@/lib/fsrs/grade";
import { applyGrade, applyUndo, previewFor, annotateLog } from "@/lib/review/core";
import { Rating } from "@/lib/fsrs/core";

let db: Db;
const DAY = 86_400_000;

async function makeProblem(slug: string) {
  const [p] = await db.insert(problems).values({ slug, title: slug, difficulty: "medium" }).returning();
  return p;
}

beforeAll(async () => {
  db = await freshDb();
});

describe("grading", () => {
  it("first solve creates the card, logs resolve #1 and activates the problem", async () => {
    const settings = await getSettings();
    const p = await makeProblem("first-solve");
    const t0 = new Date("2026-09-01T17:00:00Z");
    await db.transaction((tx) => applyFirstSolve(tx, p.id, Rating.Good, t0, settings));
    const row = (await db.query.problems.findFirst({ where: eq(problems.id, p.id), with: { card: true } }))!;
    expect(row.status).toBe("active");
    expect(row.resolveCount).toBe(1);
    expect(row.reviseCount).toBe(0);
    expect(row.lastMode).toBe("resolve");
    expect(row.firstSolvedAt?.getTime()).toBe(t0.getTime());
    expect(row.card?.reps).toBe(1);
    expect(row.card?.due.getTime()).toBeGreaterThan(t0.getTime() + DAY);
    expect(row.card?.due.getTime()).toBeLessThanOrEqual(t0.getTime() + 10 * DAY);
  });

  it("previews match what the same-instant grade applies, and counters follow the mode", async () => {
    const settings = await getSettings();
    const p = await makeProblem("preview-vs-grade");
    const t0 = new Date("2026-09-01T17:00:00Z");
    await db.transaction((tx) => applyFirstSolve(tx, p.id, Rating.Good, t0, settings));
    const t1 = new Date(t0.getTime() + 4 * DAY);
    const preview = await previewFor(db, settings, p.id, t1);
    expect(preview[1]).toBeLessThan(preview[3]);
    expect(preview[3]).toBeLessThanOrEqual(preview[4]);
    const res = await applyGrade(
      db,
      settings,
      { problemId: p.id, clientReviewId: randomUUID(), rating: Rating.Good, mode: "revise", durationSeconds: null, note: null, appendNoteToPitfalls: false },
      t1,
    );
    expect(res.duplicate).toBe(false);
    expect(res.scheduledDays).toBe(preview[3]);
    const row = (await db.query.problems.findFirst({ where: eq(problems.id, p.id), with: { card: true } }))!;
    expect(row.reviseCount).toBe(1);
    expect(row.resolveCount).toBe(1);
    expect(row.lastMode).toBe("revise");
    expect(row.card?.reps).toBe(2);
  });

  it("a repeated client_review_id is a no-op that returns the first result", async () => {
    const settings = await getSettings();
    const p = await makeProblem("idempotent");
    const t0 = new Date("2026-09-01T17:00:00Z");
    await db.transaction((tx) => applyFirstSolve(tx, p.id, Rating.Good, t0, settings));
    const id = randomUUID();
    const input = { problemId: p.id, clientReviewId: id, rating: Rating.Hard as const, mode: "resolve" as const, durationSeconds: 900, note: null, appendNoteToPitfalls: false };
    const a = await applyGrade(db, settings, input, new Date(t0.getTime() + 3 * DAY));
    const b = await applyGrade(db, settings, input, new Date(t0.getTime() + 3 * DAY + 5000));
    expect(b.duplicate).toBe(true);
    expect(b.logId).toBe(a.logId);
    const row = (await db.query.problems.findFirst({ where: eq(problems.id, p.id) }))!;
    expect(row.resolveCount).toBe(2);
    const logs = await db.select().from(reviewLogs).where(eq(reviewLogs.problemId, p.id));
    expect(logs).toHaveLength(2);
  });

  it("undo restores the card, marks the log undone and decrements the right counter", async () => {
    const settings = await getSettings();
    const p = await makeProblem("undo");
    const t0 = new Date("2026-09-01T17:00:00Z");
    await db.transaction((tx) => applyFirstSolve(tx, p.id, Rating.Good, t0, settings));
    const before = (await db.query.cards.findFirst({ where: eq(cards.problemId, p.id) }))!;
    const t1 = new Date(t0.getTime() + 5 * DAY);
    const res = await applyGrade(
      db,
      settings,
      { problemId: p.id, clientReviewId: randomUUID(), rating: Rating.Again, mode: "revise", durationSeconds: null, note: null, appendNoteToPitfalls: false },
      t1,
    );
    let row = (await db.query.problems.findFirst({ where: eq(problems.id, p.id), with: { card: true } }))!;
    expect(row.reviseCount).toBe(1);
    expect(row.card?.lapses).toBe(1);

    await applyUndo(db, settings, res.logId, new Date(t1.getTime() + 60_000));
    row = (await db.query.problems.findFirst({ where: eq(problems.id, p.id), with: { card: true } }))!;
    expect(row.reviseCount).toBe(0);
    expect(row.lastMode).toBe("resolve");
    expect(row.card?.due.getTime()).toBe(before.due.getTime());
    expect(row.card?.stability).toBeCloseTo(before.stability, 6);
    expect(row.card?.difficulty).toBeCloseTo(before.difficulty, 6);
    expect(row.card?.reps).toBe(before.reps);
    expect(row.card?.lapses).toBe(before.lapses);
    const log = (await db.query.reviewLogs.findFirst({ where: eq(reviewLogs.id, res.logId) }))!;
    expect(log.undoneAt).not.toBeNull();
    await expect(applyUndo(db, settings, res.logId, new Date())).rejects.toThrow(/already undone/);
  });

  it("only the most recent grade can be undone", async () => {
    const settings = await getSettings();
    const p = await makeProblem("undo-order");
    const t0 = new Date("2026-09-01T17:00:00Z");
    await db.transaction((tx) => applyFirstSolve(tx, p.id, Rating.Good, t0, settings));
    const a = await applyGrade(db, settings, { problemId: p.id, clientReviewId: randomUUID(), rating: Rating.Good, mode: "revise", durationSeconds: null, note: null, appendNoteToPitfalls: false }, new Date(t0.getTime() + 3 * DAY));
    await applyGrade(db, settings, { problemId: p.id, clientReviewId: randomUUID(), rating: Rating.Good, mode: "revise", durationSeconds: null, note: null, appendNoteToPitfalls: false }, new Date(t0.getTime() + 9 * DAY));
    await expect(applyUndo(db, settings, a.logId, new Date())).rejects.toThrow(/most recent/);
  });

  it("a note can be appended to pitfalls", async () => {
    const settings = await getSettings();
    const p = await makeProblem("note");
    const t0 = new Date("2026-09-01T17:00:00Z");
    await db.transaction((tx) => applyFirstSolve(tx, p.id, Rating.Good, t0, settings));
    const res = await applyGrade(db, settings, { problemId: p.id, clientReviewId: randomUUID(), rating: Rating.Hard, mode: "resolve", durationSeconds: 1200, note: null, appendNoteToPitfalls: false }, new Date(t0.getTime() + 3 * DAY));
    await annotateLog(db, res.logId, "Forgot to handle the empty array", true);
    const row = (await db.query.problems.findFirst({ where: eq(problems.id, p.id) }))!;
    expect(row.pitfalls).toBe("- Forgot to handle the empty array");
    const log = (await db.query.reviewLogs.findFirst({ where: eq(reviewLogs.id, res.logId) }))!;
    expect(log.note).toBe("Forgot to handle the empty array");
  });
});
