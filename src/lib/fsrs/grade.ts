import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { Tx } from "@/db";
import { cards, problems, reviewLogs, type Settings } from "@/db/schema";
import { cardToRow, logToRow, newSeededCard, type Grade } from "./core";
import { schedulerForNow } from "./scheduler";

export interface FirstSolveOptions {
  clientReviewId?: string;
  durationSeconds?: number | null;
}

/**
 * "Mark as solved": creates the card and applies the first rating as resolve #1.
 * Runs inside the caller's transaction.
 */
export async function applyFirstSolve(
  tx: Tx,
  problemId: string,
  rating: Grade,
  now: Date,
  settings: Settings,
  opts: FirstSolveOptions = {},
) {
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
      mode: "resolve",
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
      firstSolvedAt: sql`coalesce(${problems.firstSolvedAt}, ${now})`,
      resolveCount: sql`${problems.resolveCount} + 1`,
      lastMode: "resolve",
      updatedAt: now,
    })
    .where(eq(problems.id, problemId));
  return { card, log };
}
