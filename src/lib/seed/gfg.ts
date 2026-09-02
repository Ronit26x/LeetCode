import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db";
import {
  problemRelations,
  problems,
  problemTags,
  tags,
  type TagColor,
  type TagKind,
} from "@/db/schema";

/** One row of data/seed/gfg-backlog.json, parsed from the GeeksforGeeks "solved" list. */
export const gfgRowSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  url: z.url(),
  source: z.literal("gfg"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  gfgDifficulty: z.string().optional(),
  solvedAgo: z.string().optional(),
  priorSolvedAt: z.iso.date(),
  priorSolvedPrecision: z.enum(["day", "month", "year"]),
  tier: z.enum(["core", "warmup", "skip"]),
  /** The first tag is the primary topic; the rest are patterns. */
  tags: z.array(z.string().trim().min(1).max(40)).min(1),
  relatedSlugs: z.array(z.string().trim().min(1)).default([]),
});
export type GfgRow = z.infer<typeof gfgRowSchema>;
export const gfgFileSchema = z.array(gfgRowSchema).min(1);

export const TOPIC_TAGS = [
  "Backtracking",
  "Greedy",
  "Graphs",
  "Heap / Priority Queue",
  "Binary Search Tree",
  "Trees",
  "Queue / Deque",
  "Stack",
  "Linked List",
  "Strings",
  "Arrays & Hashing",
  "Matrix",
  "Sorting",
  "Binary Search",
  "Recursion",
  "Bit Manipulation",
  "Math",
  "Design",
  "Two Pointers",
  "Sliding Window",
  "Prefix Sum",
  "1-D DP",
];
export const PATTERN_TAGS = [
  "BFS/DFS",
  "Topological Sort",
  "Shortest Path",
  "Monotonic Stack",
  "Intervals",
  "Union-Find",
  "2-D DP",
];

const COLORS: TagColor[] = [
  "blue",
  "sky",
  "teal",
  "amber",
  "orange",
  "indigo",
  "lime",
  "green",
  "red",
  "pink",
  "violet",
  "stone",
];

function kindFor(name: string): TagKind {
  if (TOPIC_TAGS.includes(name)) return "topic";
  if (PATTERN_TAGS.includes(name)) return "pattern";
  return "custom";
}

function colorFor(name: string): TagColor {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export interface SeedSummary {
  dryRun: boolean;
  insertedBacklog: number;
  insertedArchived: number;
  alreadyPresent: number;
  /** Existing rows whose empty prior-solve, tier, source or batch fields were filled. */
  backfilled: number;
  tagsCreated: string[];
  relationsCreated: number;
  /** Backlog rows inserted in this run, by their first (primary) tag. */
  byTopic: Record<string, number>;
  warnings: string[];
}

class DryRunRollback extends Error {
  constructor(public summary: SeedSummary) {
    super("dry run");
  }
}

/**
 * Upserts the GFG list by slug. Never touches cards or review logs, never overwrites anything
 * the user may have edited (title, tags, tier, notes, status): existing rows only get empty
 * history fields filled in. Relations are attached both ways with no duplicates.
 */
export async function seedGfg(
  db: Db,
  rows: GfgRow[],
  opts: { dryRun: boolean; batch: string; now?: Date },
): Promise<SeedSummary> {
  const now = opts.now ?? new Date();
  const summary: SeedSummary = {
    dryRun: opts.dryRun,
    insertedBacklog: 0,
    insertedArchived: 0,
    alreadyPresent: 0,
    backfilled: 0,
    tagsCreated: [],
    relationsCreated: 0,
    byTopic: {},
    warnings: [],
  };
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.slug)) summary.warnings.push(`duplicate slug in file: ${r.slug}`);
    seen.add(r.slug);
  }
  try {
    await db.transaction(async (tx) => {
      // Tags: reuse by case-insensitive name, create the rest with the right kind.
      const tagIdByLower = new Map<string, string>();
      for (const t of await tx.select({ id: tags.id, name: tags.name }).from(tags))
        tagIdByLower.set(t.name.toLowerCase(), t.id);
      const wanted = [...new Set(rows.flatMap((r) => r.tags))];
      const [{ maxOrder }] = await tx
        .select({ maxOrder: sql<number>`coalesce(max(${tags.sortOrder}), -1)::int` })
        .from(tags);
      let order = maxOrder + 1;
      for (const name of wanted) {
        if (tagIdByLower.has(name.toLowerCase())) continue;
        const [row] = await tx
          .insert(tags)
          .values({ name, kind: kindFor(name), color: colorFor(name), sortOrder: order++ })
          .returning({ id: tags.id });
        tagIdByLower.set(name.toLowerCase(), row.id);
        summary.tagsCreated.push(name);
      }

      // Problems by slug.
      const existing = new Map<
        string,
        {
          id: string;
          priorSolvedAt: string | null;
          tier: string | null;
          importBatch: string | null;
          url: string | null;
          source: string;
        }
      >();
      const slugs = rows.map((r) => r.slug);
      for (let i = 0; i < slugs.length; i += 200) {
        const chunk = slugs.slice(i, i + 200);
        const found = await tx
          .select({
            id: problems.id,
            slug: problems.slug,
            priorSolvedAt: problems.priorSolvedAt,
            tier: problems.tier,
            importBatch: problems.importBatch,
            url: problems.url,
            source: problems.source,
          })
          .from(problems)
          .where(and(eq(problems.source, "gfg"), inArray(problems.slug, chunk)));
        for (const f of found) existing.set(f.slug, f);
      }
      const idBySlug = new Map<string, string>();
      for (const r of rows) {
        const found = existing.get(r.slug);
        if (found) {
          idBySlug.set(r.slug, found.id);
          summary.alreadyPresent++;
          const patch: Record<string, unknown> = {};
          if (!found.priorSolvedAt) {
            patch.priorSolvedAt = r.priorSolvedAt;
            patch.priorSolvedPrecision = r.priorSolvedPrecision;
          }
          if (!found.tier) patch.tier = r.tier;
          if (!found.importBatch) patch.importBatch = opts.batch;
          if (!found.url) patch.url = r.url;
          if (Object.keys(patch).length) {
            await tx
              .update(problems)
              .set({ ...patch, updatedAt: now })
              .where(eq(problems.id, found.id));
            summary.backfilled++;
          }
          continue;
        }
        const archived = r.tier === "skip";
        const [created] = await tx
          .insert(problems)
          .values({
            slug: r.slug,
            title: r.title,
            url: r.url,
            source: "gfg",
            difficulty: r.difficulty,
            status: archived ? "archived" : "backlog",
            tier: r.tier,
            priorSolvedAt: r.priorSolvedAt,
            priorSolvedPrecision: r.priorSolvedPrecision,
            importBatch: opts.batch,
            createdAt: now,
            updatedAt: now,
          })
          .returning({ id: problems.id });
        idBySlug.set(r.slug, created.id);
        if (archived) summary.insertedArchived++;
        else {
          summary.insertedBacklog++;
          summary.byTopic[r.tags[0]] = (summary.byTopic[r.tags[0]] ?? 0) + 1;
        }
        const tagValues = r.tags.map((name, position) => ({
          problemId: created.id,
          tagId: tagIdByLower.get(name.toLowerCase())!,
          position,
        }));
        await tx.insert(problemTags).values(tagValues).onConflictDoNothing();
      }

      // Relations, both ways, once every slug is known.
      for (const r of rows) {
        const id = idBySlug.get(r.slug)!;
        for (const other of r.relatedSlugs) {
          const rid = idBySlug.get(other);
          if (!rid) {
            summary.warnings.push(
              `${r.slug}: related slug ${other} is not in the file or the library`,
            );
            continue;
          }
          if (rid === id) continue;
          const inserted = await tx
            .insert(problemRelations)
            .values([
              { problemId: id, relatedProblemId: rid },
              { problemId: rid, relatedProblemId: id },
            ])
            .onConflictDoNothing()
            .returning({ problemId: problemRelations.problemId });
          summary.relationsCreated += inserted.length;
        }
      }
      if (opts.dryRun) throw new DryRunRollback(summary);
    });
    return summary;
  } catch (e) {
    if (e instanceof DryRunRollback) return e.summary;
    throw e;
  }
}

export function formatSeedSummary(s: SeedSummary): string {
  const lines = [
    `${s.dryRun ? "Dry run (nothing written)" : "Seed complete"}`,
    `  inserted to backlog:   ${s.insertedBacklog}`,
    `  inserted as archived:  ${s.insertedArchived}`,
    `  already present:       ${s.alreadyPresent}${s.backfilled ? ` (${s.backfilled} backfilled)` : ""}`,
    `  tags created:          ${s.tagsCreated.length}${s.tagsCreated.length ? ` (${s.tagsCreated.join(", ")})` : ""}`,
    `  relations created:     ${s.relationsCreated}`,
  ];
  const topics = Object.entries(s.byTopic).sort((a, b) => b[1] - a[1]);
  if (topics.length) {
    lines.push("  backlog rows by primary topic:");
    for (const [t, n] of topics) lines.push(`    ${t.padEnd(24)} ${n}`);
  }
  for (const w of s.warnings) lines.push(`  warning: ${w}`);
  return lines.join("\n");
}
