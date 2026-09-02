import "server-only";
import { and, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { problems, reviewLogs, type Difficulty, type TagColor } from "@/db/schema";
import { getSettings } from "@/db/bootstrap";
import { calendarDayKey } from "@/lib/day";
import { enrichProblems, type ProblemListItem } from "@/lib/problems/queries";
import { daysUntilInterview } from "@/lib/fsrs/scheduler";
import { formatDate } from "@/lib/format";

export interface StatsData {
  tz: string;
  totals: { problems: number; active: number; reviews: number; revises: number; resolves: number };
  heatmap: { day: string; count: number }[];
  retention: { d7: RetentionWindow; d30: RetentionWindow; desired: number };
  byState: { new: number; review: number; lapsed: number };
  byStatus: { backlog: number; active: number; suspended: number; archived: number };
  stabilityBuckets: { label: string; count: number }[];
  tagMastery: { id: string; name: string; color: TagColor; count: number; meanR: number | null; meanS: number | null }[];
  resolveTime: { difficulty: Difficulty; avgMinutes: number | null; target: number; n: number }[];
  readiness: {
    interviewDate: string;
    label: string;
    days: number;
    meanRecall: number | null;
    shareAbove90: number | null;
    weakest: { id: string; title: string; leetcodeNumber: number | null; difficulty: Difficulty; recall: number }[];
    cardCount: number;
  } | null;
}

export interface RetentionWindow {
  total: number;
  pass: number;
  rate: number | null;
}

const BUCKETS: { label: string; max: number }[] = [
  { label: "<1d", max: 1 },
  { label: "1-3d", max: 3 },
  { label: "3-7d", max: 7 },
  { label: "1-2w", max: 14 },
  { label: "2-4w", max: 30 },
  { label: "1-3mo", max: 90 },
  { label: "3mo+", max: Number.POSITIVE_INFINITY },
];

export async function getStats(now = new Date()): Promise<StatsData> {
  const settings = await getSettings();
  const db = await getDb();
  const tz = settings.timezone;

  const rows = await db.query.problems.findMany({ with: { card: true, problemTags: { with: { tag: true } } } });
  const items = await enrichProblems(rows, { settings, now });
  const active = items.filter((i) => i.status === "active" && i.card);

  const logs = await db
    .select({ mode: reviewLogs.mode, rating: reviewLogs.rating, at: reviewLogs.reviewedAt, seconds: reviewLogs.durationSeconds, problemId: reviewLogs.problemId })
    .from(reviewLogs)
    .where(and(isNull(reviewLogs.undoneAt), sql`${reviewLogs.rating} > 0`));

  // Heatmap over the last 365 calendar days in the user's timezone.
  const counts = new Map<string, number>();
  for (const l of logs) {
    const key = calendarDayKey(l.at, tz);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const heatmap: { day: string; count: number }[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const key = calendarDayKey(d, tz);
    heatmap.push({ day: key, count: counts.get(key) ?? 0 });
  }

  function window(days: number): RetentionWindow {
    const since = now.getTime() - days * 86_400_000;
    const inWin = logs.filter((l) => l.at.getTime() >= since);
    const pass = inWin.filter((l) => l.rating > 1).length;
    return { total: inWin.length, pass, rate: inWin.length ? pass / inWin.length : null };
  }

  const byState = { new: 0, review: 0, lapsed: 0 };
  for (const i of active) if (i.memoryState) byState[i.memoryState]++;
  const byStatus = { backlog: 0, active: 0, suspended: 0, archived: 0 };
  for (const i of items) byStatus[i.status]++;

  const stabilityBuckets = BUCKETS.map((b) => ({ label: b.label, count: 0 }));
  for (const i of active) {
    const s = i.card!.stability;
    const idx = BUCKETS.findIndex((b) => s < b.max);
    stabilityBuckets[idx === -1 ? BUCKETS.length - 1 : idx].count++;
  }

  const tagAgg = new Map<string, { id: string; name: string; color: TagColor; rs: number[]; ss: number[]; count: number }>();
  for (const i of items) {
    for (const t of i.tags) {
      const agg = tagAgg.get(t.id) ?? { id: t.id, name: t.name, color: t.color, rs: [], ss: [], count: 0 };
      agg.count++;
      if (i.status === "active" && i.card) {
        if (i.retrievability !== null) agg.rs.push(i.retrievability);
        if (i.card.stability > 0) agg.ss.push(i.card.stability);
      }
      tagAgg.set(t.id, agg);
    }
  }
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const tagMastery = [...tagAgg.values()]
    .map((a) => ({ id: a.id, name: a.name, color: a.color, count: a.count, meanR: mean(a.rs), meanS: mean(a.ss) }))
    .sort((a, b) => (a.meanR ?? 2) - (b.meanR ?? 2) || b.count - a.count);

  const diffOf = new Map(items.map((i) => [i.id, i.difficulty]));
  const resolveTime = (["easy", "medium", "hard"] as Difficulty[]).map((d) => {
    const secs = logs.filter((l) => l.mode === "resolve" && l.seconds && diffOf.get(l.problemId) === d).map((l) => l.seconds!);
    return { difficulty: d, avgMinutes: secs.length ? mean(secs)! / 60 : null, target: settings.resolveTimeTargetsMin[d], n: secs.length };
  });

  const days = daysUntilInterview(settings, now);
  let readiness: StatsData["readiness"] = null;
  if (settings.interviewDate && days !== null && days >= 0) {
    const withPrediction = active.filter((i): i is ProblemListItem & { predictedInterviewRecall: number } => i.predictedInterviewRecall !== null);
    const recalls = withPrediction.map((i) => i.predictedInterviewRecall);
    readiness = {
      interviewDate: settings.interviewDate,
      label: formatDate(settings.interviewDate + "T12:00:00", tz, "MMM d"),
      days,
      meanRecall: mean(recalls),
      shareAbove90: recalls.length ? recalls.filter((r) => r >= 0.9).length / recalls.length : null,
      weakest: [...withPrediction]
        .sort((a, b) => a.predictedInterviewRecall - b.predictedInterviewRecall)
        .slice(0, 20)
        .map((i) => ({ id: i.id, title: i.title, leetcodeNumber: i.leetcodeNumber, difficulty: i.difficulty, recall: i.predictedInterviewRecall })),
      cardCount: active.length,
    };
  }

  return {
    tz,
    totals: {
      problems: items.length,
      active: active.length,
      reviews: logs.length,
      revises: logs.filter((l) => l.mode === "revise").length,
      resolves: logs.filter((l) => l.mode === "resolve").length,
    },
    heatmap,
    retention: { d7: window(7), d30: window(30), desired: settings.desiredRetention },
    byState,
    byStatus,
    stabilityBuckets,
    tagMastery,
    resolveTime,
    readiness,
  };
}

export { problems as problemsTable };
