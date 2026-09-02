import "server-only";
import { and, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  cards,
  problems,
  queueDays,
  reviewLogs,
  settings as settingsTable,
  type Settings,
} from "@/db/schema";
import { getSettings } from "@/db/bootstrap";
import { dayEnd, dayStart, reviewDayKey } from "@/lib/day";
import { enrichProblems, type ProblemListItem } from "@/lib/problems/queries";
import { schedulerForNow } from "@/lib/fsrs/scheduler";
import { interleave, primaryTagOf } from "./interleave";

export interface QueueStats {
  reviewDay: string;
  dayStartAt: Date;
  dayEndAt: Date;
  due: number;
  revises: number;
  resolves: number;
  estimatedMinutes: number;
  doneToday: {
    total: number;
    revises: number;
    resolves: number;
    seconds: number;
    againIds: string[];
  };
  tomorrow: number;
  streak: number;
  retention: number;
  daysUntilInterview: number | null;
  interviewDate: string | null;
}

export interface TodayQueue {
  settings: Settings;
  stats: QueueStats;
  /** The full materialized order for the day (due items only, in queue order). */
  items: ProblemListItem[];
  /** Cram: not-yet-due cards sorted by lowest predicted interview-day recall. Empty outside the window. */
  cram: ProblemListItem[];
  cramActive: boolean;
  /** Ordered ids for the whole review day, including ones already reviewed today. */
  orderedIds: string[];
}

/**
 * Once per review day, before the queue is built: shorten (never lengthen) the due date of any
 * active card whose interval is longer than the effective retention implies. Fuzz off, idempotent.
 */
export async function applyRetentionRamp(settings: Settings, now: Date): Promise<number> {
  const reviewDay = reviewDayKey(now, settings.timezone, settings.dayStartHour);
  if (settings.lastRampAppliedDay === reviewDay) return 0;
  const sched = schedulerForNow(settings, now);
  const db = await getDb();
  let changed = 0;
  const inWindow =
    settings.retentionRampEnabled &&
    sched.daysUntilInterview !== null &&
    sched.daysUntilInterview >= 0 &&
    sched.daysUntilInterview < settings.retentionRampDays;
  if (inWindow) {
    const rows = await db
      .select({ card: cards })
      .from(cards)
      .innerJoin(problems, eq(problems.id, cards.problemId))
      .where(and(eq(problems.status, "active"), sql`${cards.state} <> 0`));
    for (const { card } of rows) {
      if (!card.lastReview || card.stability <= 0) continue;
      const ivl = sched.fNoFuzz.next_interval(card.stability, card.elapsedDays);
      if (ivl > 0 && ivl < card.scheduledDays) {
        const due = new Date(card.lastReview.getTime() + ivl * 86_400_000);
        await db
          .update(cards)
          .set({ due, scheduledDays: ivl, updatedAt: now })
          .where(and(eq(cards.problemId, card.problemId), eq(cards.updatedAt, card.updatedAt)));
        changed++;
      }
    }
  }
  await db
    .update(settingsTable)
    .set({ lastRampAppliedDay: reviewDay })
    .where(eq(settingsTable.id, 1));
  return changed;
}

async function streakDays(settings: Settings, now: Date): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ at: reviewLogs.reviewedAt })
    .from(reviewLogs)
    .where(
      and(
        isNull(reviewLogs.undoneAt),
        sql`${reviewLogs.rating} > 0`,
        gte(reviewLogs.reviewedAt, new Date(now.getTime() - 400 * 86_400_000)),
      ),
    );
  const days = new Set(
    rows.map((r) => reviewDayKey(r.at, settings.timezone, settings.dayStartHour)),
  );
  const today = reviewDayKey(now, settings.timezone, settings.dayStartHour);
  let cursor = dayStart(now, settings.timezone, settings.dayStartHour);
  let streak = 0;
  // Today counts if reviewed; otherwise the streak is measured up to yesterday.
  if (!days.has(today)) cursor = new Date(cursor.getTime() - 3_600_000);
  for (let i = 0; i < 400; i++) {
    const key = reviewDayKey(cursor, settings.timezone, settings.dayStartHour);
    if (!days.has(key)) break;
    streak++;
    cursor = new Date(
      dayStart(cursor, settings.timezone, settings.dayStartHour).getTime() - 3_600_000,
    );
  }
  return streak;
}

export async function getTodayQueue(now = new Date()): Promise<TodayQueue> {
  const settings = await getSettings();
  await applyRetentionRamp(settings, now);
  const db = await getDb();
  const tz = settings.timezone;
  const hour = settings.dayStartHour;
  const reviewDay = reviewDayKey(now, tz, hour);
  const dayStartAt = dayStart(now, tz, hour);
  const dayEndAt = dayEnd(now, tz, hour);
  const sched = schedulerForNow(settings, now);

  const active = await db.query.problems.findMany({
    where: eq(problems.status, "active"),
    with: { card: true, problemTags: { with: { tag: true } } },
  });
  const withCard = active.filter((p) => p.card);
  const dueRows = withCard.filter((p) => p.card!.due.getTime() < dayEndAt.getTime());
  const dueItems = await enrichProblems(dueRows, { settings, now });
  const byId = new Map(dueItems.map((i) => [i.id, i]));

  // Materialize today's order once; later requests read it back and append what became due.
  const existing = await db.query.queueDays.findFirst({
    where: eq(queueDays.reviewDay, reviewDay),
  });
  const known = new Set(existing?.problemIds ?? []);
  const fresh = dueItems
    .filter((i) => !known.has(i.id))
    .map((i) => ({
      id: i.id,
      dueDay: reviewDayKey(i.card!.due, tz, hour),
      primaryTag: primaryTagOf(i.tags),
    }));
  const appended = interleave(fresh, reviewDay).map((f) => f.id);
  let orderedIds = [...(existing?.problemIds ?? []), ...appended];
  if (!existing) {
    await db
      .insert(queueDays)
      .values({ reviewDay, problemIds: orderedIds, generatedAt: now })
      .onConflictDoNothing();
    const row = await db.query.queueDays.findFirst({ where: eq(queueDays.reviewDay, reviewDay) });
    orderedIds = row?.problemIds ?? orderedIds;
  } else if (appended.length) {
    await db
      .update(queueDays)
      .set({ problemIds: orderedIds })
      .where(eq(queueDays.reviewDay, reviewDay));
  }
  const items = orderedIds.map((id) => byId.get(id)).filter((i): i is ProblemListItem => !!i);

  // Done today
  const doneRows = await db
    .select({
      mode: reviewLogs.mode,
      rating: reviewLogs.rating,
      seconds: reviewLogs.durationSeconds,
      problemId: reviewLogs.problemId,
    })
    .from(reviewLogs)
    .where(
      and(
        isNull(reviewLogs.undoneAt),
        sql`${reviewLogs.rating} > 0`,
        gte(reviewLogs.reviewedAt, dayStartAt),
        lt(reviewLogs.reviewedAt, dayEndAt),
      ),
    );
  const doneToday = {
    total: doneRows.length,
    revises: doneRows.filter((r) => r.mode === "revise").length,
    resolves: doneRows.filter((r) => r.mode === "resolve").length,
    seconds: doneRows.reduce((a, r) => a + (r.seconds ?? 0), 0),
    againIds: [...new Set(doneRows.filter((r) => r.rating === 1).map((r) => r.problemId))],
  };

  const tomorrowEnd = new Date(dayEndAt.getTime() + 86_400_000);
  const tomorrow = withCard.filter((p) => {
    const t = p.card!.due.getTime();
    return (
      t >= dayEndAt.getTime() &&
      t < tomorrowEnd.getTime() + (dayEnd(tomorrowEnd, tz, hour).getTime() - tomorrowEnd.getTime())
    );
  }).length;

  const revises = items.filter((i) => i.suggestion?.mode !== "resolve").length;
  const resolves = items.length - revises;
  const targets = settings.resolveTimeTargetsMin;
  const estimatedMinutes = items.reduce(
    (a, i) =>
      a +
      (i.suggestion?.mode === "resolve" ? targets[i.difficulty] : settings.reviseTimeEstimateMin),
    0,
  );

  const cramActive =
    sched.daysUntilInterview !== null &&
    sched.daysUntilInterview >= 0 &&
    sched.daysUntilInterview <= settings.cramWindowDays;
  let cram: ProblemListItem[] = [];
  if (cramActive) {
    const notDue = withCard.filter((p) => p.card!.due.getTime() >= dayEndAt.getTime());
    const enriched = await enrichProblems(notDue, { settings, now });
    cram = enriched
      .filter((i) => i.predictedInterviewRecall !== null)
      .sort((a, b) => (a.predictedInterviewRecall ?? 1) - (b.predictedInterviewRecall ?? 1))
      .slice(0, 40);
  }

  return {
    settings,
    items,
    cram,
    cramActive,
    orderedIds,
    stats: {
      reviewDay,
      dayStartAt,
      dayEndAt,
      due: items.length,
      revises,
      resolves,
      estimatedMinutes,
      doneToday,
      tomorrow,
      streak: await streakDays(settings, now),
      retention: sched.retention,
      daysUntilInterview: sched.daysUntilInterview,
      interviewDate: settings.interviewDate,
    },
  };
}

/** Ids for a session: the day's order, or a single problem for "Review now". */
export async function getSessionIds(problemId?: string): Promise<string[]> {
  if (problemId) {
    const db = await getDb();
    const rows = await db
      .select({ id: problems.id })
      .from(problems)
      .where(and(eq(problems.id, problemId), inArray(problems.status, ["active", "suspended"])));
    return rows.map((r) => r.id);
  }
  const q = await getTodayQueue();
  return q.items.map((i) => i.id);
}
