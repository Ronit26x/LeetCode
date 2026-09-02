import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  problems,
  reviewLogs,
  tags,
  type CardRow,
  type Difficulty,
  type Problem,
  type ProblemStatus,
  type ReviewLogRow,
  type ReviewMode,
  type Settings,
  type Snippet,
  type Tag,
} from "@/db/schema";
import { getSettings } from "@/db/bootstrap";
import { predictedRecallOn, retrievability, rowToCard } from "@/lib/fsrs/core";
import { schedulerForNow } from "@/lib/fsrs/scheduler";
import { suggestMode, type ModeSuggestion } from "@/lib/fsrs/suggest-mode";
import { reviewDaysUntil } from "@/lib/day";

export type MemoryState = "new" | "review" | "lapsed";

export interface TagBrief {
  id: string;
  name: string;
  color: Tag["color"];
  kind: Tag["kind"];
  alwaysResolve: boolean;
  sortOrder: number;
}

export interface CardBrief {
  due: Date;
  stability: number;
  difficulty: number;
  state: number;
  lastReview: Date | null;
  reps: number;
  lapses: number;
  scheduledDays: number;
}

export interface ProblemListItem {
  id: string;
  leetcodeNumber: number | null;
  slug: string;
  title: string;
  url: string | null;
  difficulty: Difficulty;
  status: ProblemStatus;
  reviseCount: number;
  resolveCount: number;
  lastMode: ReviewMode | null;
  firstSolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tags: TagBrief[];
  card: CardBrief | null;
  lastRating: number | null;
  memoryState: MemoryState | null;
  retrievability: number | null;
  predictedInterviewRecall: number | null;
  /** Whole review days until due (negative = overdue). */
  dueInDays: number | null;
  suggestion: ModeSuggestion | null;
}

export type SortKey =
  | "due"
  | "stability"
  | "retrievability"
  | "difficulty"
  | "lastReviewed"
  | "revises"
  | "resolves"
  | "title"
  | "number"
  | "created";

export interface ListFilters {
  q?: string;
  tagId?: string;
  difficulty?: Difficulty;
  status?: ProblemStatus | "all";
  memory?: MemoryState;
  sort?: SortKey;
  dir?: "asc" | "desc";
}

const DIFF_ORDER: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

function toTagBrief(t: Tag): TagBrief {
  return {
    id: t.id,
    name: t.name,
    color: t.color,
    kind: t.kind,
    alwaysResolve: t.alwaysResolve,
    sortOrder: t.sortOrder,
  };
}

function toCardBrief(c: CardRow): CardBrief {
  return {
    due: c.due,
    stability: c.stability,
    difficulty: c.difficulty,
    state: c.state,
    lastReview: c.lastReview,
    reps: c.reps,
    lapses: c.lapses,
    scheduledDays: c.scheduledDays,
  };
}

/** Last non-undone, non-manual rating per problem. */
async function lastRatings(problemIds: string[]): Promise<Map<string, number>> {
  const db = await getDb();
  if (problemIds.length === 0) return new Map();
  const rows = await db
    .selectDistinctOn([reviewLogs.problemId], {
      problemId: reviewLogs.problemId,
      rating: reviewLogs.rating,
    })
    .from(reviewLogs)
    .where(
      and(
        inArray(reviewLogs.problemId, problemIds),
        isNull(reviewLogs.undoneAt),
        sql`${reviewLogs.rating} > 0`,
      ),
    )
    .orderBy(reviewLogs.problemId, desc(reviewLogs.reviewedAt), desc(reviewLogs.createdAt));
  return new Map(rows.map((r) => [r.problemId, r.rating]));
}

/** Graded (non-undone, non-manual) logs per problem, chronological, for the mode heuristic. */
async function gradedLogs(problemIds: string[]): Promise<Map<string, ReviewLogRow[]>> {
  const db = await getDb();
  const map = new Map<string, ReviewLogRow[]>();
  if (problemIds.length === 0) return map;
  const rows = await db
    .select()
    .from(reviewLogs)
    .where(
      and(
        inArray(reviewLogs.problemId, problemIds),
        isNull(reviewLogs.undoneAt),
        sql`${reviewLogs.rating} > 0`,
      ),
    )
    .orderBy(reviewLogs.reviewedAt, reviewLogs.createdAt);
  for (const r of rows) {
    const list = map.get(r.problemId) ?? [];
    list.push(r);
    map.set(r.problemId, list);
  }
  return map;
}

export interface EnrichContext {
  settings: Settings;
  now: Date;
}

export async function enrichProblems(
  rows: (Problem & { card: CardRow | null; problemTags: { tag: Tag }[] })[],
  ctx: EnrichContext,
): Promise<ProblemListItem[]> {
  const ids = rows.map((r) => r.id);
  const [ratings, logs] = await Promise.all([lastRatings(ids), gradedLogs(ids)]);
  const sched = schedulerForNow(ctx.settings, ctx.now);
  return rows.map((r) => {
    const tagList = r.problemTags
      .map((pt) => toTagBrief(pt.tag))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    const card = r.card ? rowToCard(r.card) : null;
    const lastRating = ratings.get(r.id) ?? null;
    let memoryState: MemoryState | null = null;
    if (card) memoryState = card.state === 0 ? "new" : lastRating === 1 ? "lapsed" : "review";
    const problemLogs = logs.get(r.id) ?? [];
    return {
      id: r.id,
      leetcodeNumber: r.leetcodeNumber,
      slug: r.slug,
      title: r.title,
      url: r.url,
      difficulty: r.difficulty,
      status: r.status,
      reviseCount: r.reviseCount,
      resolveCount: r.resolveCount,
      lastMode: r.lastMode,
      firstSolvedAt: r.firstSolvedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      tags: tagList,
      card: r.card ? toCardBrief(r.card) : null,
      lastRating,
      memoryState,
      retrievability: card ? retrievability(sched.f, card, ctx.now) : null,
      predictedInterviewRecall:
        card && sched.interviewDate && (sched.daysUntilInterview ?? -1) >= 0
          ? predictedRecallOn(sched.f, card, sched.interviewDate)
          : null,
      dueInDays: r.card
        ? reviewDaysUntil(ctx.now, r.card.due, ctx.settings.timezone, ctx.settings.dayStartHour)
        : null,
      suggestion:
        card && r.status === "active"
          ? suggestMode(
              { stability: card.stability, state: card.state },
              problemLogs.map((l) => ({
                mode: l.mode,
                rating: l.rating,
                stability: l.stability,
                reviewedAt: l.reviewedAt,
              })),
              {
                reviseCount: r.reviseCount,
                resolveCount: r.resolveCount,
                lastMode: r.lastMode,
                tags: tagList,
              },
              ctx.settings,
            )
          : null,
    };
  });
}

function matchesQuery(p: Problem & { problemTags: { tag: Tag }[] }, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const asNumber = Number.parseInt(needle, 10);
  if (Number.isFinite(asNumber) && String(asNumber) === needle && p.leetcodeNumber === asNumber)
    return true;
  const hay = [p.title, p.slug, p.promptSummary, p.keyInsight, p.approach, p.pitfalls, p.notes]
    .join("\n")
    .toLowerCase();
  if (hay.includes(needle)) return true;
  return p.problemTags.some((pt) => pt.tag.name.toLowerCase().includes(needle));
}

export async function listProblems(
  filters: ListFilters = {},
  now = new Date(),
): Promise<ProblemListItem[]> {
  const db = await getDb();
  const settings = await getSettings();
  const status = filters.status ?? "all";
  const rows = await db.query.problems.findMany({
    where: status === "all" ? undefined : eq(problems.status, status),
    with: { card: true, problemTags: { with: { tag: true } } },
  });
  const filtered = rows.filter((r) => {
    if (filters.difficulty && r.difficulty !== filters.difficulty) return false;
    if (filters.tagId && !r.problemTags.some((pt) => pt.tag.id === filters.tagId)) return false;
    if (filters.q && !matchesQuery(r, filters.q)) return false;
    return true;
  });
  let items = await enrichProblems(filtered, { settings, now });
  if (filters.memory) items = items.filter((i) => i.memoryState === filters.memory);
  const dir = filters.dir === "desc" ? -1 : 1;
  const key = filters.sort ?? "due";
  const nul = (v: number | null | undefined) =>
    v === null || v === undefined ? Number.POSITIVE_INFINITY : v;
  items.sort((a, b) => {
    let c = 0;
    switch (key) {
      case "due":
        c = nul(a.card?.due.getTime()) - nul(b.card?.due.getTime());
        break;
      case "stability":
        c = nul(a.card?.stability) - nul(b.card?.stability);
        break;
      case "retrievability":
        c = nul(a.retrievability) - nul(b.retrievability);
        break;
      case "difficulty":
        c = DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty];
        break;
      case "lastReviewed":
        c = nul(a.card?.lastReview?.getTime()) - nul(b.card?.lastReview?.getTime());
        break;
      case "revises":
        c = a.reviseCount - b.reviseCount;
        break;
      case "resolves":
        c = a.resolveCount - b.resolveCount;
        break;
      case "title":
        c = a.title.localeCompare(b.title);
        break;
      case "number":
        c = nul(a.leetcodeNumber) - nul(b.leetcodeNumber);
        break;
      case "created":
        c = a.createdAt.getTime() - b.createdAt.getTime();
        break;
    }
    if (c === 0) c = a.title.localeCompare(b.title);
    return c * dir;
  });
  return items;
}

export interface ProblemDetail extends Problem {
  snippets: Snippet[];
  tags: TagBrief[];
  related: {
    id: string;
    title: string;
    leetcodeNumber: number | null;
    difficulty: Difficulty;
    status: ProblemStatus;
  }[];
  card: CardRow | null;
  logs: ReviewLogRow[];
  computed: Pick<
    ProblemListItem,
    | "lastRating"
    | "memoryState"
    | "retrievability"
    | "predictedInterviewRecall"
    | "dueInDays"
    | "suggestion"
  >;
}

export async function getProblem(id: string, now = new Date()): Promise<ProblemDetail | null> {
  const db = await getDb();
  const row = await db.query.problems.findFirst({
    where: eq(problems.id, id),
    with: {
      card: true,
      snippets: { orderBy: (s, { asc }) => [asc(s.sortOrder), asc(s.createdAt)] },
      problemTags: { with: { tag: true } },
      relations: { with: { related: true } },
      reviewLogs: { orderBy: (l, { desc }) => [desc(l.reviewedAt), desc(l.createdAt)] },
    },
  });
  if (!row) return null;
  const settings = await getSettings();
  const [item] = await enrichProblems([row], { settings, now });
  return {
    ...row,
    snippets: row.snippets,
    tags: item.tags,
    related: row.relations.map((rel) => ({
      id: rel.related.id,
      title: rel.related.title,
      leetcodeNumber: rel.related.leetcodeNumber,
      difficulty: rel.related.difficulty,
      status: rel.related.status,
    })),
    card: row.card,
    logs: row.reviewLogs,
    computed: {
      lastRating: item.lastRating,
      memoryState: item.memoryState,
      retrievability: item.retrievability,
      predictedInterviewRecall: item.predictedInterviewRecall,
      dueInDays: item.dueInDays,
      suggestion: item.suggestion,
    },
  };
}

export async function listTags(): Promise<TagBrief[]> {
  const db = await getDb();
  const rows = await db.query.tags.findMany({
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
  });
  return rows.map(toTagBrief);
}

export interface TagWithCounts extends TagBrief {
  total: number;
  backlog: number;
  active: number;
}

export async function listTagsWithCounts(): Promise<TagWithCounts[]> {
  const db = await getDb();
  const rows = await db.query.tags.findMany({
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
    with: { problemTags: { with: { problem: { columns: { status: true } } } } },
  });
  return rows.map((t) => ({
    ...toTagBrief(t),
    total: t.problemTags.length,
    backlog: t.problemTags.filter((pt) => pt.problem.status === "backlog").length,
    active: t.problemTags.filter((pt) => pt.problem.status === "active").length,
  }));
}

export interface ProblemBrief {
  id: string;
  title: string;
  leetcodeNumber: number | null;
  difficulty: Difficulty;
  status: ProblemStatus;
}

export async function searchProblemsBrief(q: string, limit = 12): Promise<ProblemBrief[]> {
  const db = await getDb();
  const needle = q.trim().toLowerCase();
  const rows = await db
    .select({
      id: problems.id,
      title: problems.title,
      leetcodeNumber: problems.leetcodeNumber,
      difficulty: problems.difficulty,
      status: problems.status,
    })
    .from(problems)
    .where(
      needle
        ? sql`(lower(${problems.title}) like ${"%" + needle + "%"} or ${problems.leetcodeNumber}::text like ${needle + "%"} or ${problems.slug} like ${"%" + needle + "%"})`
        : undefined,
    )
    .orderBy(problems.leetcodeNumber, problems.title)
    .limit(limit);
  return rows;
}

export async function countByStatus(): Promise<Record<ProblemStatus, number>> {
  const db = await getDb();
  const rows = await db
    .select({ status: problems.status, count: sql<number>`count(*)::int` })
    .from(problems)
    .groupBy(problems.status);
  const out: Record<ProblemStatus, number> = { backlog: 0, active: 0, suspended: 0, archived: 0 };
  for (const r of rows) out[r.status] = r.count;
  return out;
}

export { tags as tagsTable };
