import { eq } from "drizzle-orm";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { Db } from "@/db";
import { cards, problems, type Settings } from "@/db/schema";
import { reviewDayKey } from "@/lib/day";

/**
 * Spreading the backlog: every active card's due date moves later by the same number of days, so
 * the oldest overdue review lands tomorrow and the rest follow in the order the scheduler gave
 * them, one day's worth at a time, instead of all at once. Only `due` moves. Stability,
 * difficulty, the interval the last grade produced and the review logs stay as they are: ts-fsrs
 * measures elapsed time from `last_review`, never from `due`, so the memory model is untouched
 * and the next grade simply sees a later review.
 */

export interface SpreadMove {
  problemId: string;
  slug: string;
  from: Date;
  to: Date;
}

export interface SpreadReport {
  /** The review day the shift was computed on. */
  today: string;
  /** Whole days every due date moved (negative moves earlier). 0 when nothing was due by today. */
  shiftDays: number;
  /** Active cards per review day before and after, YYYY-MM-DD to count, in day order. */
  before: Record<string, number>;
  after: Record<string, number>;
  /** Cards written. 0 on a dry run or when there was nothing to move. */
  changed: number;
  moves: SpreadMove[];
}

function dayNumberOf(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/**
 * Days to push every due date so the oldest review due by `today` lands on the day after it:
 * five days overdue becomes tomorrow, four days overdue the day after, due today in six days.
 * 0 when nothing is due by today, so there is nothing to spread.
 */
export function backlogShiftDays(dueDays: readonly string[], today: string): number {
  let oldest: string | null = null;
  for (const d of dueDays) if (d <= today && (oldest === null || d < oldest)) oldest = d;
  if (oldest === null) return 0;
  return dayNumberOf(today) - dayNumberOf(oldest) + 1;
}

/**
 * `due` moved `days` calendar days at the same wall-clock time in `tz`, so a review day maps to
 * the review day `days` later even across a DST change (a plain 24-hour multiple would land an
 * hour early after the November change and cross the day-start boundary).
 */
export function shiftDue(due: Date, days: number, tz: string): Date {
  const wall = toZonedTime(due, tz);
  wall.setDate(wall.getDate() + days);
  return fromZonedTime(wall, tz);
}

function histogram(days: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of [...days].sort()) out[d] = (out[d] ?? 0) + 1;
  return out;
}

/**
 * Computes, and with `apply` writes, the spread for every active card. `days` overrides the
 * computed shift (a negative value moves cards earlier, so the same number negated undoes a
 * spread made the same day). All writes happen in one transaction.
 */
export async function spreadBacklog(
  db: Db,
  settings: Settings,
  now: Date,
  opts: { apply: boolean; days?: number },
): Promise<SpreadReport> {
  const tz = settings.timezone;
  const hour = settings.dayStartHour;
  const today = reviewDayKey(now, tz, hour);
  const rows = await db
    .select({ problemId: cards.problemId, slug: problems.slug, due: cards.due })
    .from(cards)
    .innerJoin(problems, eq(problems.id, cards.problemId))
    .where(eq(problems.status, "active"));
  const dueDays = rows.map((r) => reviewDayKey(r.due, tz, hour));
  const shiftDays = opts.days ?? backlogShiftDays(dueDays, today);
  const moves: SpreadMove[] = rows.map((r) => ({
    problemId: r.problemId,
    slug: r.slug,
    from: r.due,
    to: shiftDays === 0 ? r.due : shiftDue(r.due, shiftDays, tz),
  }));
  const after = histogram(moves.map((m) => reviewDayKey(m.to, tz, hour)));
  let changed = 0;
  if (opts.apply && shiftDays !== 0) {
    await db.transaction(async (tx) => {
      for (const m of moves) {
        await tx
          .update(cards)
          .set({ due: m.to, updatedAt: now })
          .where(eq(cards.problemId, m.problemId));
        changed++;
      }
    });
  }
  return { today, shiftDays, before: histogram(dueDays), after, changed, moves };
}
