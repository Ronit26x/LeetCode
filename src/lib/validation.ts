import { z } from "zod";

export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export const problemStatusSchema = z.enum(["backlog", "active", "suspended", "archived"]);
export const snippetLanguageSchema = z.enum(["cpp", "python", "java", "text"]);
export const reviewModeSchema = z.enum(["revise", "resolve"]);
export const tagKindSchema = z.enum(["topic", "pattern", "company", "custom"]);
export const tagColorSchema = z.enum([
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
export const gradeSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

const text = (max: number) => z.string().max(max).default("");

export const snippetInputSchema = z.object({
  id: z.uuid().optional(),
  label: z.string().trim().min(1, "Give the snippet a label").max(60),
  language: snippetLanguageSchema.default("cpp"),
  // Stored exactly as typed. No trimming.
  code: z.string().max(200_000),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

export const problemInputSchema = z.object({
  leetcodeNumber: z.number().int().positive().max(100_000).nullable().default(null),
  slug: z.string().trim().max(200).nullable().default(null),
  title: z.string().trim().min(1, "A title is required").max(200),
  url: z
    .union([z.url("Enter a full URL"), z.literal("")])
    .default("")
    .transform((v) => v || null),
  difficulty: difficultySchema.default("medium"),
  promptSummary: text(4_000),
  keyInsight: text(4_000),
  approach: text(20_000),
  timeComplexity: text(200),
  spaceComplexity: text(200),
  pitfalls: text(20_000),
  notes: text(200_000),
  snippets: z.array(snippetInputSchema).max(20).default([]),
  tagIds: z.array(z.uuid()).max(50).default([]),
  newTags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  relatedIds: z.array(z.uuid()).max(50).default([]),
});
export type ProblemInput = z.input<typeof problemInputSchema>;

export const solveOutcomeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("backlog") }),
  z.object({
    kind: z.literal("solved"),
    rating: gradeSchema,
    durationSeconds: z.number().int().min(0).max(86_400).nullable().default(null),
    clientReviewId: z.uuid().optional(),
  }),
]);

export const createProblemSchema = problemInputSchema.extend({ outcome: solveOutcomeSchema });
export type CreateProblemInput = z.input<typeof createProblemSchema>;

export const updateProblemSchema = problemInputSchema.partial().extend({ id: z.uuid() });
export type UpdateProblemInput = z.input<typeof updateProblemSchema>;

export const markSolvedSchema = z.object({
  id: z.uuid(),
  rating: gradeSchema,
  durationSeconds: z.number().int().min(0).max(86_400).nullable().default(null),
  clientReviewId: z.uuid().optional(),
});

export const tagInputSchema = z.object({
  name: z.string().trim().min(1, "A name is required").max(40),
  color: tagColorSchema.default("stone"),
  kind: tagKindSchema.default("custom"),
  alwaysResolve: z.boolean().default(false),
});

export const updateTagSchema = tagInputSchema.partial().extend({ id: z.uuid() });

export const idListSchema = z.array(z.uuid()).min(1).max(500);

export const gradeInputSchema = z.object({
  problemId: z.uuid(),
  clientReviewId: z.uuid(),
  rating: gradeSchema,
  mode: reviewModeSchema,
  durationSeconds: z.number().int().min(0).max(86_400).nullable().default(null),
  note: z.string().trim().max(2_000).nullable().default(null),
  appendNoteToPitfalls: z.boolean().default(false),
  /** Captured at flip time; the same instant feeds the interval previews and the grade. */
  now: z.iso.datetime(),
});
export type GradeInput = z.input<typeof gradeInputSchema>;

export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  const path = issue.path.filter((p) => typeof p === "string").join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

function isTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const settingsPatchSchema = z
  .object({
    timezone: z.string().trim().refine(isTimeZone, "Not an IANA time zone"),
    dayStartHour: z.number().int().min(0).max(23),
    desiredRetention: z.number().min(0.8).max(0.97),
    maximumInterval: z.number().int().min(1).max(36_500),
    interviewDate: z.union([z.iso.date(), z.null()]),
    retentionRampEnabled: z.boolean(),
    retentionRampDays: z.number().int().min(1).max(90),
    retentionRampTarget: z.number().min(0.8).max(0.97),
    cramWindowDays: z.number().int().min(0).max(90),
    allowEasyInRevise: z.boolean(),
    resolveMilestonesDays: z.array(z.number().int().min(1).max(3650)).max(12),
    resolveAfterNRevises: z.number().int().min(0).max(50),
    resolveTimeTargetsMin: z.object({
      easy: z.number().int().min(1).max(240),
      medium: z.number().int().min(1).max(240),
      hard: z.number().int().min(1).max(240),
    }),
    reviseTimeEstimateMin: z.number().int().min(1).max(120),
    dailySoftCap: z.union([z.number().int().min(1).max(1000), z.null()]),
  })
  .partial();
export type SettingsPatch = z.input<typeof settingsPatchSchema>;

export const fsrsWeightsSchema = z.array(z.number().finite()).length(21, "FSRS-6 has exactly 21 weights");

/** Everything, for backup. Import is idempotent by slug, tag name and client_review_id. */
export const exportSchema = z.object({
  app: z.literal("recur"),
  version: z.literal(1),
  exportedAt: z.string(),
  settings: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(
    z.object({
      name: z.string().trim().min(1).max(40),
      color: tagColorSchema.default("stone"),
      kind: tagKindSchema.default("custom"),
      alwaysResolve: z.boolean().default(false),
      sortOrder: z.number().int().default(0),
    }),
  ),
  problems: z.array(
    z.object({
      slug: z.string().trim().min(1).max(200),
      leetcodeNumber: z.number().int().nullable().default(null),
      title: z.string().trim().min(1).max(200),
      url: z.string().nullable().default(null),
      difficulty: difficultySchema.default("medium"),
      status: problemStatusSchema.default("backlog"),
      promptSummary: z.string().default(""),
      keyInsight: z.string().default(""),
      approach: z.string().default(""),
      timeComplexity: z.string().default(""),
      spaceComplexity: z.string().default(""),
      pitfalls: z.string().default(""),
      notes: z.string().default(""),
      reviseCount: z.number().int().min(0).default(0),
      resolveCount: z.number().int().min(0).default(0),
      lastMode: reviewModeSchema.nullable().default(null),
      firstSolvedAt: z.string().nullable().default(null),
      createdAt: z.string().optional(),
      tags: z.array(z.string()).default([]),
      related: z.array(z.string()).default([]),
      snippets: z
        .array(
          z.object({
            label: z.string().default("Optimal"),
            language: snippetLanguageSchema.default("cpp"),
            code: z.string(),
            sortOrder: z.number().int().default(0),
          }),
        )
        .default([]),
      card: z
        .object({
          due: z.string(),
          stability: z.number(),
          difficulty: z.number(),
          elapsedDays: z.number().int(),
          scheduledDays: z.number().int(),
          learningSteps: z.number().int().default(0),
          reps: z.number().int(),
          lapses: z.number().int(),
          state: z.number().int().min(0).max(3),
          lastReview: z.string().nullable().default(null),
        })
        .nullable()
        .default(null),
      logs: z
        .array(
          z.object({
            clientReviewId: z.uuid(),
            mode: reviewModeSchema,
            rating: z.number().int().min(0).max(4),
            durationSeconds: z.number().int().nullable().default(null),
            note: z.string().nullable().default(null),
            reviewedAt: z.string(),
            undoneAt: z.string().nullable().default(null),
            state: z.number().int(),
            due: z.string(),
            stability: z.number(),
            difficulty: z.number(),
            elapsedDays: z.number().int(),
            lastElapsedDays: z.number().int(),
            scheduledDays: z.number().int(),
            learningSteps: z.number().int().default(0),
            resultScheduledDays: z.number().int().default(0),
            prevDue: z.string().nullable().default(null),
          }),
        )
        .default([]),
    }),
  ),
});
export type ExportFile = z.infer<typeof exportSchema>;
