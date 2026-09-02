import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { cards, problems, reviewLogs, type ReviewMode, type Settings } from "@/db/schema";
import { cardToRow, logToRow, rowToCard, rowToLog, GRADES, type Grade } from "@/lib/fsrs/core";
import { schedulerForNow } from "@/lib/fsrs/scheduler";

export type GradePreview = Record<1 | 2 | 3 | 4, number>;

export interface GradeCoreInput {
  problemId: string;
  clientReviewId: string;
  rating: Grade;
  mode: ReviewMode;
  durationSeconds: number | null;
  note: string | null;
  appendNoteToPitfalls: boolean;
}

export interface GradeResult {
  logId: string;
  scheduledDays: number;
  due: Date;
  duplicate: boolean;
}

export class ReviewError extends Error {}

/** The interval each grade would schedule, from f.repeat, with the same `now` the grade will use. */
export async function previewFor(db: Db, settings: Settings, problemId: string, now: Date): Promise<GradePreview> {
  const row = await db.query.cards.findFirst({ where: eq(cards.problemId, problemId) });
  if (!row) throw new ReviewError("This problem has no card yet.");
  const { f } = schedulerForNow(settings, now);
  const preview = f.repeat(rowToCard(row), now);
  const out = {} as GradePreview;
  for (const g of GRADES) out[g as 1 | 2 | 3 | 4] = preview[g].card.scheduled_days;
  return out;
}

/**
 * One grade: f.next, then card + log + counter in a single transaction.
 * A repeated client_review_id returns the existing result instead of grading twice.
 */
export async function applyGrade(db: Db, settings: Settings, input: GradeCoreInput, at: Date): Promise<GradeResult> {
  const existing = await db.query.reviewLogs.findFirst({ where: eq(reviewLogs.clientReviewId, input.clientReviewId) });
  if (existing) {
    const card = await db.query.cards.findFirst({ where: eq(cards.problemId, existing.problemId) });
    return { logId: existing.id, scheduledDays: existing.resultScheduledDays, due: card?.due ?? existing.due, duplicate: true };
  }
  const { f } = schedulerForNow(settings, at);
  return db.transaction(async (tx) => {
    const row = await tx.query.cards.findFirst({ where: eq(cards.problemId, input.problemId) });
    if (!row) throw new ReviewError("This problem has no card yet.");
    const { card, log } = f.next(rowToCard(row), at, input.rating);
    await tx.update(cards).set({ ...cardToRow(card), updatedAt: at }).where(eq(cards.problemId, input.problemId));
    const [inserted] = await tx
      .insert(reviewLogs)
      .values({
        clientReviewId: input.clientReviewId,
        problemId: input.problemId,
        mode: input.mode,
        durationSeconds: input.durationSeconds,
        note: input.note,
        ...logToRow(log),
        resultScheduledDays: card.scheduled_days,
        prevDue: row.due,
      })
      .returning({ id: reviewLogs.id });
    const patch: Record<string, unknown> = { lastMode: input.mode, updatedAt: at };
    if (input.mode === "revise") patch.reviseCount = sql`${problems.reviseCount} + 1`;
    else patch.resolveCount = sql`${problems.resolveCount} + 1`;
    if (input.appendNoteToPitfalls && input.note) {
      const line = "- " + input.note;
      patch.pitfalls = sql`case when ${problems.pitfalls} = '' then ${line} else ${problems.pitfalls} || ${"\n" + line} end`;
    }
    await tx.update(problems).set(patch).where(eq(problems.id, input.problemId));
    return { logId: inserted.id, scheduledDays: card.scheduled_days, due: card.due, duplicate: false };
  });
}

/** Undo the most recent grade of a problem: f.rollback, restore the card, mark the log undone, fix the counter. */
export async function applyUndo(db: Db, settings: Settings, logId: string, now: Date): Promise<{ problemId: string }> {
  return db.transaction(async (tx) => {
    const log = await tx.query.reviewLogs.findFirst({ where: eq(reviewLogs.id, logId) });
    if (!log) throw new ReviewError("Nothing to undo.");
    if (log.undoneAt) throw new ReviewError("That grade was already undone.");
    const latest = await tx.query.reviewLogs.findFirst({
      where: and(eq(reviewLogs.problemId, log.problemId), isNull(reviewLogs.undoneAt)),
      orderBy: [desc(reviewLogs.reviewedAt), desc(reviewLogs.createdAt)],
    });
    if (!latest || latest.id !== log.id) throw new ReviewError("Only the most recent grade can be undone.");
    const row = await tx.query.cards.findFirst({ where: eq(cards.problemId, log.problemId) });
    if (!row) throw new ReviewError("Card not found.");
    const { f } = schedulerForNow(settings, now);
    const prev = f.rollback(rowToCard(row), rowToLog(log));
    // rollback sets due to the review instant; the snapshot restores the real previous due.
    if (log.prevDue) prev.due = log.prevDue;
    await tx.update(cards).set({ ...cardToRow(prev), updatedAt: now }).where(eq(cards.problemId, log.problemId));
    await tx.update(reviewLogs).set({ undoneAt: now }).where(eq(reviewLogs.id, log.id));
    const previous = await tx.query.reviewLogs.findFirst({
      where: and(
        eq(reviewLogs.problemId, log.problemId),
        isNull(reviewLogs.undoneAt),
        sql`${reviewLogs.id} <> ${log.id}`,
        sql`${reviewLogs.rating} > 0`,
      ),
      orderBy: [desc(reviewLogs.reviewedAt), desc(reviewLogs.createdAt)],
    });
    const patch: Record<string, unknown> = { lastMode: previous?.mode ?? null, updatedAt: now };
    if (log.rating > 0) {
      if (log.mode === "revise") patch.reviseCount = sql`greatest(${problems.reviseCount} - 1, 0)`;
      else patch.resolveCount = sql`greatest(${problems.resolveCount} - 1, 0)`;
    }
    await tx.update(problems).set(patch).where(eq(problems.id, log.problemId));
    return { problemId: log.problemId };
  });
}

/** Attach the optional "what went wrong" note after an Again or Hard, optionally appending it to pitfalls. */
export async function annotateLog(db: Db, logId: string, note: string, appendToPitfalls: boolean): Promise<void> {
  await db.transaction(async (tx) => {
    const log = await tx.query.reviewLogs.findFirst({ where: eq(reviewLogs.id, logId) });
    if (!log) throw new ReviewError("Log not found.");
    await tx.update(reviewLogs).set({ note }).where(eq(reviewLogs.id, logId));
    if (appendToPitfalls && note.trim()) {
      const line = "- " + note.trim();
      await tx
        .update(problems)
        .set({
          pitfalls: sql`case when ${problems.pitfalls} = '' then ${line} else ${problems.pitfalls} || ${"\n" + line} end`,
          updatedAt: new Date(),
        })
        .where(eq(problems.id, log.problemId));
    }
  });
}
