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
