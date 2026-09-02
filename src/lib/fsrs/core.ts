import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  GenSeedStrategyWithCardId,
  Rating,
  State,
  StrategyMode,
  type Card,
  type FSRS,
  type FSRSParameters,
  type Grade,
  type ReviewLog,
} from "ts-fsrs";
import type { CardRow, ReviewLogRow } from "@/db/schema";

export { Rating, State, createEmptyCard };
export type { Card, Grade, ReviewLog, FSRS };

/** A ts-fsrs Card with the problem id attached, so fuzz is seeded per card and not per timestamp. */
export type SeededCard = Card & { problem_id: string };

export const GRADES: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];

export interface SchedulerSettings {
  desiredRetention: number;
  maximumInterval: number;
  fsrsParams: number[];
}

/** All scheduling goes through here: short-term steps off, fuzz on, retention from settings (or the ramp). */
export function buildParameters(
  settings: SchedulerSettings,
  requestRetention?: number,
): FSRSParameters {
  return generatorParameters({
    request_retention: requestRetention ?? settings.desiredRetention,
    maximum_interval: settings.maximumInterval,
    w: settings.fsrsParams,
    enable_fuzz: true,
    enable_short_term: false,
    learning_steps: [],
    relearning_steps: [],
  });
}

export function buildFsrs(settings: SchedulerSettings, requestRetention?: number): FSRS {
  return fsrs(buildParameters(settings, requestRetention)).useStrategy(
    StrategyMode.SEED,
    GenSeedStrategyWithCardId("problem_id"),
  );
}

/** Same parameters, fuzz off. Used for the retention-ramp pass so it is idempotent. */
export function buildFsrsNoFuzz(settings: SchedulerSettings, requestRetention?: number): FSRS {
  return fsrs({ ...buildParameters(settings, requestRetention), enable_fuzz: false });
}

export function rowToCard(row: CardRow): SeededCard {
  return {
    problem_id: row.problemId,
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsedDays,
    scheduled_days: row.scheduledDays,
    learning_steps: row.learningSteps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: row.lastReview ?? undefined,
  };
}

export type CardValues = Omit<CardRow, "problemId" | "createdAt" | "updatedAt">;

export function cardToRow(card: Card): CardValues {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ?? null,
  };
}

export function newSeededCard(problemId: string, now: Date): SeededCard {
  return { ...createEmptyCard(now), problem_id: problemId };
}

export type LogValues = Pick<
  ReviewLogRow,
  | "rating"
  | "state"
  | "due"
  | "stability"
  | "difficulty"
  | "elapsedDays"
  | "lastElapsedDays"
  | "scheduledDays"
  | "learningSteps"
  | "reviewedAt"
>;

export function logToRow(log: ReviewLog): LogValues {
  return {
    rating: log.rating,
    state: log.state,
    due: log.due,
    stability: log.stability,
    difficulty: log.difficulty,
    elapsedDays: log.elapsed_days,
    lastElapsedDays: log.last_elapsed_days,
    scheduledDays: log.scheduled_days,
    learningSteps: log.learning_steps,
    reviewedAt: log.review,
  };
}

export function rowToLog(row: ReviewLogRow): ReviewLog {
  return {
    rating: row.rating as Rating,
    state: row.state as State,
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsedDays,
    last_elapsed_days: row.lastElapsedDays,
    scheduled_days: row.scheduledDays,
    learning_steps: row.learningSteps,
    review: row.reviewedAt,
  };
}

/** Probability of recall right now, or null for a card that was never reviewed. */
export function retrievability(f: FSRS, card: Card, now: Date): number | null {
  if (card.state === State.New || !card.last_review) return null;
  const r = f.get_retrievability(card, now, false);
  return Number.isFinite(r) ? r : null;
}

/** Predicted recall on `date` if the card is not reviewed again before then. */
export function predictedRecallOn(f: FSRS, card: Card, date: Date): number | null {
  if (card.state === State.New || !card.last_review || card.stability <= 0) return null;
  const elapsed = (date.getTime() - card.last_review.getTime()) / 86_400_000;
  if (elapsed < 0) return null;
  const r = f.forgetting_curve(elapsed, card.stability);
  return Number.isFinite(r) ? r : null;
}

export interface RampSettings {
  desiredRetention: number;
  retentionRampEnabled: boolean;
  retentionRampDays: number;
  retentionRampTarget: number;
}

export const RETENTION_MIN = 0.8;
export const RETENTION_MAX = 0.97;

/**
 * Desired retention for today. Linear from `desiredRetention` to `retentionRampTarget`
 * over the final `retentionRampDays` review days before the interview; the base value
 * outside the window, after the interview, or with the ramp off.
 */
export function effectiveRetention(
  settings: RampSettings,
  daysUntilInterview: number | null,
): number {
  const base = clampRetention(settings.desiredRetention);
  if (!settings.retentionRampEnabled || daysUntilInterview === null) return base;
  if (daysUntilInterview < 0) return base;
  const days = Math.max(1, settings.retentionRampDays);
  if (daysUntilInterview >= days) return base;
  const progress = 1 - daysUntilInterview / days;
  return clampRetention(base + (clampRetention(settings.retentionRampTarget) - base) * progress);
}

export function clampRetention(r: number): number {
  return Math.min(RETENTION_MAX, Math.max(RETENTION_MIN, r));
}

export type RatingValue = 1 | 2 | 3 | 4;

export function isGrade(n: number): n is Grade {
  return n === 1 || n === 2 || n === 3 || n === 4;
}
