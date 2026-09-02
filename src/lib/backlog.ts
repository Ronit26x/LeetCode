/* Pure helpers for the backlog: honest "solved ... ago" wording and the default ordering. */

export type Precision = "day" | "month" | "year";
export type Tier = "core" | "warmup" | "skip";

const DAY_MS = 86_400_000;

/** Whole days between a YYYY-MM-DD date and now (UTC calendar days). */
export function daysSince(dateKey: string, now: Date): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const then = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((today - then) / DAY_MS);
}

/**
 * The wording is only as precise as the source was: "3 days ago" was exact to the day,
 * "8 months ago" only to the month, "a year ago" only to the year.
 */
export function solvedAgoLabel(
  dateKey: string | null,
  precision: Precision | null,
  now: Date,
): string | null {
  if (!dateKey) return null;
  const days = daysSince(dateKey, now);
  if (precision === "day" || precision === null) {
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 60) return `${days} days ago`;
  }
  const months = Math.round(days / 30.44);
  if (precision === "month" || (precision === "day" && days >= 60 && days < 365)) {
    if (months <= 1) return "about a month ago";
    if (months < 12) return `about ${months} months ago`;
  }
  const years = Math.round(days / 365.25);
  if (years <= 1) return "about a year ago";
  if (years >= 5) return "5+ years ago";
  return `about ${years} years ago`;
}

export interface BacklogSortable {
  tier: Tier | null;
  priorSolvedAt: string | null;
  difficulty: "easy" | "medium" | "hard";
  title: string;
  createdAt: Date;
}

export type BacklogSort = "stalest" | "recent" | "difficulty" | "title";

const TIER_RANK: Record<string, number> = { core: 0, warmup: 1, skip: 2 };
const DIFF_RANK = { easy: 0, medium: 1, hard: 2 };

function tierRank(t: Tier | null): number {
  return t ? TIER_RANK[t] : 3;
}

/**
 * Default: core before warmup, then the stalest prior solve first (the problem most likely lost),
 * problems without a prior solve after those. Other sorts are plain.
 */
export function orderBacklog<T extends BacklogSortable>(
  items: T[],
  sort: BacklogSort = "stalest",
): T[] {
  const byPrior = (a: T, b: T, dir: 1 | -1) => {
    if (a.priorSolvedAt === b.priorSolvedAt) return 0;
    if (!a.priorSolvedAt) return 1;
    if (!b.priorSolvedAt) return -1;
    return a.priorSolvedAt < b.priorSolvedAt ? -dir : dir;
  };
  return [...items].sort((a, b) => {
    switch (sort) {
      case "stalest":
        return (
          tierRank(a.tier) - tierRank(b.tier) ||
          byPrior(a, b, 1) ||
          a.createdAt.getTime() - b.createdAt.getTime() ||
          a.title.localeCompare(b.title)
        );
      case "recent":
        return (
          byPrior(a, b, -1) ||
          b.createdAt.getTime() - a.createdAt.getTime() ||
          a.title.localeCompare(b.title)
        );
      case "difficulty":
        return (
          DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty] ||
          tierRank(a.tier) - tierRank(b.tier) ||
          byPrior(a, b, 1) ||
          a.title.localeCompare(b.title)
        );
      case "title":
        return a.title.localeCompare(b.title);
    }
  });
}

/** Solved elsewhere within the last N days (inclusive). */
export function solvedWithinDays(priorSolvedAt: string | null, days: number, now: Date): boolean {
  return !!priorSolvedAt && daysSince(priorSolvedAt, now) <= days;
}
