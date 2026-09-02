import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { Tx } from "@/db";
import { cards, problems, reviewLogs, type ReviewMode, type Settings } from "@/db/schema";
import { cardToRow, logToRow, newSeededCard, type Grade } from "./core";
import { schedulerForNow } from "./scheduler";

export interface FirstSolveOptions {
  clientReviewId?: string;
  durationSeconds?: number | null;
  /** resolve (default): "Solved it (again)". revise: "Still remember it", the honest fast path for a prior solve. */
  mode?: ReviewMode;
}

/**
 * "Mark as solved": creates the card with createEmptyCard() at this moment and applies the first
 * rating now, whatever the problem's history elsewhere. Logged as resolve #1 by default, or as
 * revise #1 for "Still remember it". Runs inside the caller's transaction.
 */
export async function applyFirstSolve(
  tx: Tx,
  problemId: string,
  rating: Grade,
  now: Date,
  settings: Settings,
  opts: FirstSolveOptions = {},
) {
  const mode: ReviewMode = opts.mode ?? "resolve";
  const { f } = schedulerForNow(settings, now);
  const empty = newSeededCard(problemId, now);
  const { card, log } = f.next(empty, now, rating);
  const values = cardToRow(card);
  await tx
    .insert(cards)
    .values({ problemId, ...values })
    .onConflictDoUpdate({ target: cards.problemId, set: { ...values, updatedAt: now } });
  await tx
    .insert(reviewLogs)
    .values({
      clientReviewId: opts.clientReviewId ?? randomUUID(),
      problemId,
      mode,
      durationSeconds: opts.durationSeconds ?? null,
      note: null,
      ...logToRow(log),
      resultScheduledDays: card.scheduled_days,
      prevDue: empty.due,
    })
    .onConflictDoNothing();
  await tx
    .update(problems)
    .set({
      status: "active",
      // A raw fragment cannot type a Date param for postgres.js; pass ISO text and cast.
      firstSolvedAt: sql`coalesce(${problems.firstSolvedAt}, ${now.toISOString()}::timestamptz)`,
      ...(mode === "resolve"
        ? { resolveCount: sql`${problems.resolveCount} + 1` }
        : { reviseCount: sql`${problems.reviseCount} + 1` }),
      lastMode: mode,
      updatedAt: now,
    })
    .where(eq(problems.id, problemId));
  return { card, log };
}
