import type { ReviewMode } from "@/db/schema";

export interface SuggestCard {
  stability: number;
  state: number;
}

export interface SuggestLog {
  mode: ReviewMode;
  /** 0 Manual, 1 Again, 2 Hard, 3 Good, 4 Easy */
  rating: number;
  /** Card stability as recorded by ts-fsrs at review time (before the grade). */
  stability: number;
  reviewedAt: Date;
}

export interface SuggestProblem {
  reviseCount: number;
  resolveCount: number;
  lastMode: ReviewMode | null;
  tags: { name: string; alwaysResolve: boolean }[];
}

export interface SuggestSettings {
  resolveMilestonesDays: number[];
  resolveAfterNRevises: number;
}

export interface ModeSuggestion {
  mode: ReviewMode;
  reason: string;
}

/**
 * Proposes Revise (cheap: recall the insight) or Resolve (expensive: re-code it cold).
 * Pure. `logs` are the non-undone, non-manual logs in chronological order.
 */
export function suggestMode(
  card: SuggestCard,
  logs: SuggestLog[],
  problem: SuggestProblem,
  settings: SuggestSettings,
): ModeSuggestion {
  const graded = logs.filter((l) => l.rating >= 1 && l.rating <= 4);

  const always = problem.tags.find((t) => t.alwaysResolve);
  if (always) return { mode: "resolve", reason: `${always.name} is always resolved` };

  const last = graded.at(-1);
  if (last && last.rating === 1) return { mode: "resolve", reason: "Last grade was Again" };

  // (a) The first review after the card entered the schedule, when that first rating was Again or
  // Hard, whether it came from a solve or from "Still remember it".
  if (graded.length === 1 && graded[0].rating <= 2) {
    return {
      mode: "resolve",
      reason:
        graded[0].mode === "resolve" ? "First solve was a struggle" : "First recall was shaky",
    };
  }

  // (c) Stability crossed a milestone this card has not been resolved at.
  const milestones = [...settings.resolveMilestonesDays].filter((m) => m > 0).sort((a, b) => a - b);
  for (const m of milestones) {
    if (card.stability < m) break;
    const resolvedAt = graded.some((l) => l.mode === "resolve" && l.stability >= m);
    if (!resolvedAt) return { mode: "resolve", reason: `Stability crossed ${m}d` };
  }

  // (d) Too many consecutive revises since the last resolve.
  let streak = 0;
  for (let i = graded.length - 1; i >= 0; i--) {
    if (graded[i].mode !== "revise") break;
    streak++;
  }
  const n = settings.resolveAfterNRevises;
  if (n > 0 && streak >= n) {
    return { mode: "resolve", reason: `${streak} revises since the last resolve` };
  }

  return { mode: "revise", reason: "Recall the insight and the approach" };
}
