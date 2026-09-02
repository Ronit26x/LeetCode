import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const problemStatusEnum = pgEnum("problem_status", ["backlog", "active", "suspended", "archived"]);
export const reviewModeEnum = pgEnum("review_mode", ["revise", "resolve"]);
export const tagKindEnum = pgEnum("tag_kind", ["topic", "pattern", "company", "custom"]);
export const tagColorEnum = pgEnum("tag_color", [
  "red",
  "orange",
  "amber",
  "lime",
  "green",
  "teal",
  "sky",
  "blue",
  "indigo",
  "violet",
  "pink",
  "stone",
]);
export const snippetLanguageEnum = pgEnum("snippet_language", ["cpp", "python", "java", "text"]);

export type Difficulty = (typeof difficultyEnum.enumValues)[number];
export type ProblemStatus = (typeof problemStatusEnum.enumValues)[number];
export type ReviewMode = (typeof reviewModeEnum.enumValues)[number];
export type TagKind = (typeof tagKindEnum.enumValues)[number];
export type TagColor = (typeof tagColorEnum.enumValues)[number];
export type SnippetLanguage = (typeof snippetLanguageEnum.enumValues)[number];

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
};

export const problems = pgTable(
  "problems",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leetcodeNumber: integer("leetcode_number"),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    url: text("url"),
    difficulty: difficultyEnum("difficulty").notNull().default("medium"),
    status: problemStatusEnum("status").notNull().default("backlog"),
    promptSummary: text("prompt_summary").notNull().default(""),
    keyInsight: text("key_insight").notNull().default(""),
    approach: text("approach").notNull().default(""),
    timeComplexity: text("time_complexity").notNull().default(""),
    spaceComplexity: text("space_complexity").notNull().default(""),
    pitfalls: text("pitfalls").notNull().default(""),
    notes: text("notes").notNull().default(""),
    reviseCount: integer("revise_count").notNull().default(0),
    resolveCount: integer("resolve_count").notNull().default(0),
    lastMode: reviewModeEnum("last_mode"),
    firstSolvedAt: timestamp("first_solved_at", { withTimezone: true, mode: "date" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("problems_slug_idx").on(t.slug),
    index("problems_status_idx").on(t.status),
    index("problems_number_idx").on(t.leetcodeNumber),
    index("problems_title_idx").on(t.title),
  ],
);

export const snippets = pgTable(
  "snippets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Optimal"),
    language: snippetLanguageEnum("language").notNull().default("cpp"),
    code: text("code").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("snippets_problem_idx").on(t.problemId)],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    color: tagColorEnum("color").notNull().default("stone"),
    kind: tagKindEnum("kind").notNull().default("custom"),
    alwaysResolve: boolean("always_resolve").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex("tags_name_lower_idx").on(sql`lower(${t.name})`)],
);

export const problemTags = pgTable(
  "problem_tags",
  {
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.problemId, t.tagId] }), index("problem_tags_tag_idx").on(t.tagId)],
);

export const problemRelations = pgTable(
  "problem_relations",
  {
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    relatedProblemId: uuid("related_problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.problemId, t.relatedProblemId] }),
    index("problem_relations_related_idx").on(t.relatedProblemId),
  ],
);

/** Mirrors the ts-fsrs Card exactly so rollback and reschedule keep working. */
export const cards = pgTable(
  "cards",
  {
    problemId: uuid("problem_id")
      .primaryKey()
      .references(() => problems.id, { onDelete: "cascade" }),
    due: timestamp("due", { withTimezone: true, mode: "date" }).notNull(),
    stability: doublePrecision("stability").notNull().default(0),
    difficulty: doublePrecision("difficulty").notNull().default(0),
    elapsedDays: integer("elapsed_days").notNull().default(0),
    scheduledDays: integer("scheduled_days").notNull().default(0),
    learningSteps: integer("learning_steps").notNull().default(0),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    /** ts-fsrs State: 0 New, 1 Learning, 2 Review, 3 Relearning. */
    state: integer("state").notNull().default(0),
    lastReview: timestamp("last_review", { withTimezone: true, mode: "date" }),
    ...timestamps,
  },
  (t) => [index("cards_due_idx").on(t.due), index("cards_state_idx").on(t.state)],
);

/** One row per grade. Carries every ts-fsrs ReviewLog field so rollback and optimization work. */
export const reviewLogs = pgTable(
  "review_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientReviewId: uuid("client_review_id").notNull(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    mode: reviewModeEnum("mode").notNull(),
    /** 0 Manual (forget/reset), 1 Again, 2 Hard, 3 Good, 4 Easy. */
    rating: integer("rating").notNull(),
    durationSeconds: integer("duration_seconds"),
    note: text("note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }).notNull(),
    undoneAt: timestamp("undone_at", { withTimezone: true, mode: "date" }),
    // ts-fsrs ReviewLog (state of the card before this review, as the library records it)
    state: integer("state").notNull(),
    due: timestamp("due", { withTimezone: true, mode: "date" }).notNull(),
    stability: doublePrecision("stability").notNull(),
    difficulty: doublePrecision("difficulty").notNull(),
    elapsedDays: integer("elapsed_days").notNull(),
    lastElapsedDays: integer("last_elapsed_days").notNull(),
    scheduledDays: integer("scheduled_days").notNull(),
    learningSteps: integer("learning_steps").notNull(),
    /** The interval the grade produced, in days, for the history timeline. */
    resultScheduledDays: integer("result_scheduled_days").notNull().default(0),
    /** The card's due date before this grade. ts-fsrs rollback cannot recover it, so undo restores it from here. */
    prevDue: timestamp("prev_due", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("review_logs_client_idx").on(t.clientReviewId),
    index("review_logs_problem_idx").on(t.problemId, t.reviewedAt),
    index("review_logs_reviewed_idx").on(t.reviewedAt),
    check("review_logs_rating_check", sql`${t.rating} between 0 and 4`),
  ],
);

export interface ResolveTimeTargets {
  easy: number;
  medium: number;
  hard: number;
}

export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    timezone: text("timezone").notNull().default("America/Los_Angeles"),
    dayStartHour: integer("day_start_hour").notNull().default(9),
    desiredRetention: doublePrecision("desired_retention").notNull().default(0.9),
    maximumInterval: integer("maximum_interval").notNull().default(365),
    /** The 21 FSRS-6 weights. */
    fsrsParams: jsonb("fsrs_params").$type<number[]>().notNull(),
    interviewDate: date("interview_date", { mode: "string" }),
    retentionRampEnabled: boolean("retention_ramp_enabled").notNull().default(true),
    retentionRampDays: integer("retention_ramp_days").notNull().default(14),
    retentionRampTarget: doublePrecision("retention_ramp_target").notNull().default(0.95),
    cramWindowDays: integer("cram_window_days").notNull().default(7),
    allowEasyInRevise: boolean("allow_easy_in_revise").notNull().default(false),
    resolveMilestonesDays: jsonb("resolve_milestones_days").$type<number[]>().notNull(),
    resolveAfterNRevises: integer("resolve_after_n_revises").notNull().default(3),
    resolveTimeTargetsMin: jsonb("resolve_time_targets_min").$type<ResolveTimeTargets>().notNull(),
    reviseTimeEstimateMin: integer("revise_time_estimate_min").notNull().default(3),
    dailySoftCap: integer("daily_soft_cap"),
    /** Review day (in `timezone`) on which the retention ramp last shortened due dates. */
    lastRampAppliedDay: date("last_ramp_applied_day", { mode: "string" }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [check("settings_single_row", sql`${t.id} = 1`)],
);

/** The materialized order of Today's queue, one row per review day, stable across reloads. */
export const queueDays = pgTable("queue_days", {
  reviewDay: date("review_day", { mode: "string" }).primaryKey(),
  problemIds: uuid("problem_ids").array().notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

export const problemsRelations = relations(problems, ({ one, many }) => ({
  card: one(cards, { fields: [problems.id], references: [cards.problemId] }),
  snippets: many(snippets),
  problemTags: many(problemTags),
  reviewLogs: many(reviewLogs),
  relations: many(problemRelations, { relationName: "from" }),
}));

export const snippetsRelations = relations(snippets, ({ one }) => ({
  problem: one(problems, { fields: [snippets.problemId], references: [problems.id] }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  problemTags: many(problemTags),
}));

export const problemTagsRelations = relations(problemTags, ({ one }) => ({
  problem: one(problems, { fields: [problemTags.problemId], references: [problems.id] }),
  tag: one(tags, { fields: [problemTags.tagId], references: [tags.id] }),
}));

export const problemRelationsRelations = relations(problemRelations, ({ one }) => ({
  problem: one(problems, {
    fields: [problemRelations.problemId],
    references: [problems.id],
    relationName: "from",
  }),
  related: one(problems, {
    fields: [problemRelations.relatedProblemId],
    references: [problems.id],
    relationName: "to",
  }),
}));

export const cardsRelations = relations(cards, ({ one }) => ({
  problem: one(problems, { fields: [cards.problemId], references: [problems.id] }),
}));

export const reviewLogsRelations = relations(reviewLogs, ({ one }) => ({
  problem: one(problems, { fields: [reviewLogs.problemId], references: [problems.id] }),
}));

export type Problem = typeof problems.$inferSelect;
export type NewProblem = typeof problems.$inferInsert;
export type Snippet = typeof snippets.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type CardRow = typeof cards.$inferSelect;
export type ReviewLogRow = typeof reviewLogs.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type QueueDay = typeof queueDays.$inferSelect;
