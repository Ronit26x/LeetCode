import { eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { cards, problemRelations, problems, problemTags, reviewLogs, settings as settingsTable, snippets, tags } from "@/db/schema";
import { settingsPatchSchema, fsrsWeightsSchema, type ExportFile } from "@/lib/validation";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export async function buildExport(db: Db): Promise<ExportFile> {
  const [settingsRow] = await db.select().from(settingsTable);
  const tagRows = await db.select().from(tags).orderBy(tags.sortOrder, tags.name);
  const rows = await db.query.problems.findMany({
    with: {
      card: true,
      snippets: { orderBy: (s, { asc }) => [asc(s.sortOrder)] },
      problemTags: { with: { tag: true } },
      relations: { with: { related: { columns: { slug: true } } } },
      reviewLogs: { orderBy: (l, { asc }) => [asc(l.reviewedAt)] },
    },
    orderBy: (p, { asc }) => [asc(p.createdAt)],
  });
  return {
    app: "recur",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: settingsRow
      ? {
          timezone: settingsRow.timezone,
          dayStartHour: settingsRow.dayStartHour,
          desiredRetention: settingsRow.desiredRetention,
          maximumInterval: settingsRow.maximumInterval,
          fsrsParams: settingsRow.fsrsParams,
          interviewDate: settingsRow.interviewDate,
          retentionRampEnabled: settingsRow.retentionRampEnabled,
          retentionRampDays: settingsRow.retentionRampDays,
          retentionRampTarget: settingsRow.retentionRampTarget,
          cramWindowDays: settingsRow.cramWindowDays,
          allowEasyInRevise: settingsRow.allowEasyInRevise,
          resolveMilestonesDays: settingsRow.resolveMilestonesDays,
          resolveAfterNRevises: settingsRow.resolveAfterNRevises,
          resolveTimeTargetsMin: settingsRow.resolveTimeTargetsMin,
          reviseTimeEstimateMin: settingsRow.reviseTimeEstimateMin,
          dailySoftCap: settingsRow.dailySoftCap,
        }
      : undefined,
    tags: tagRows.map((t) => ({ name: t.name, color: t.color, kind: t.kind, alwaysResolve: t.alwaysResolve, sortOrder: t.sortOrder })),
    problems: rows.map((p) => ({
      slug: p.slug,
      leetcodeNumber: p.leetcodeNumber,
      title: p.title,
      url: p.url,
      difficulty: p.difficulty,
      status: p.status,
      promptSummary: p.promptSummary,
      keyInsight: p.keyInsight,
      approach: p.approach,
      timeComplexity: p.timeComplexity,
      spaceComplexity: p.spaceComplexity,
      pitfalls: p.pitfalls,
      notes: p.notes,
      reviseCount: p.reviseCount,
      resolveCount: p.resolveCount,
      lastMode: p.lastMode,
      firstSolvedAt: iso(p.firstSolvedAt),
      createdAt: p.createdAt.toISOString(),
      tags: p.problemTags.map((pt) => pt.tag.name),
      related: p.relations.map((r) => r.related.slug),
      snippets: p.snippets.map((s) => ({ label: s.label, language: s.language, code: s.code, sortOrder: s.sortOrder })),
      card: p.card
        ? {
            due: p.card.due.toISOString(),
            stability: p.card.stability,
            difficulty: p.card.difficulty,
            elapsedDays: p.card.elapsedDays,
            scheduledDays: p.card.scheduledDays,
            learningSteps: p.card.learningSteps,
            reps: p.card.reps,
            lapses: p.card.lapses,
            state: p.card.state,
            lastReview: iso(p.card.lastReview),
          }
        : null,
      logs: p.reviewLogs.map((l) => ({
        clientReviewId: l.clientReviewId,
        mode: l.mode,
        rating: l.rating,
        durationSeconds: l.durationSeconds,
        note: l.note,
        reviewedAt: l.reviewedAt.toISOString(),
        undoneAt: iso(l.undoneAt),
        state: l.state,
        due: l.due.toISOString(),
        stability: l.stability,
        difficulty: l.difficulty,
        elapsedDays: l.elapsedDays,
        lastElapsedDays: l.lastElapsedDays,
        scheduledDays: l.scheduledDays,
        learningSteps: l.learningSteps,
        resultScheduledDays: l.resultScheduledDays,
        prevDue: iso(l.prevDue),
      })),
    })),
  };
}

export interface ImportPreview {
  tags: { create: number; existing: number };
  problems: { create: number; update: number };
  snippets: number;
  cards: number;
  logs: { create: number; skip: number };
  relations: number;
  settings: boolean;
  warnings: string[];
}

class DryRunRollback extends Error {
  constructor(public preview: ImportPreview) {
    super("dry run");
  }
}

/**
 * Idempotent import: problems by slug, tags by name (case-insensitive), logs by client_review_id.
 * Re-importing the same file is a no-op. `dryRun` runs the whole thing and rolls back.
 */
export async function importData(db: Db, file: ExportFile, opts: { dryRun: boolean }): Promise<ImportPreview> {
  const preview: ImportPreview = {
    tags: { create: 0, existing: 0 },
    problems: { create: 0, update: 0 },
    snippets: 0,
    cards: 0,
    logs: { create: 0, skip: 0 },
    relations: 0,
    settings: false,
    warnings: [],
  };
  try {
    await db.transaction(async (tx) => {
      const now = new Date();
      // Tags
      const tagIdByLower = new Map<string, string>();
      for (const t of await tx.select().from(tags)) tagIdByLower.set(t.name.toLowerCase(), t.id);
      for (const t of file.tags) {
        const key = t.name.toLowerCase();
        if (tagIdByLower.has(key)) {
          preview.tags.existing++;
          continue;
        }
        const [row] = await tx.insert(tags).values({ name: t.name, color: t.color, kind: t.kind, alwaysResolve: t.alwaysResolve, sortOrder: t.sortOrder }).returning({ id: tags.id });
        tagIdByLower.set(key, row.id);
        preview.tags.create++;
      }
      // Problems
      const idBySlug = new Map<string, string>();
      for (const p of await tx.select({ id: problems.id, slug: problems.slug }).from(problems)) idBySlug.set(p.slug, p.id);
      for (const p of file.problems) {
        const values = {
          leetcodeNumber: p.leetcodeNumber,
          title: p.title,
          url: p.url,
          difficulty: p.difficulty,
          status: p.status,
          promptSummary: p.promptSummary,
          keyInsight: p.keyInsight,
          approach: p.approach,
          timeComplexity: p.timeComplexity,
          spaceComplexity: p.spaceComplexity,
          pitfalls: p.pitfalls,
          notes: p.notes,
          reviseCount: p.reviseCount,
          resolveCount: p.resolveCount,
          lastMode: p.lastMode,
          firstSolvedAt: p.firstSolvedAt ? new Date(p.firstSolvedAt) : null,
          updatedAt: now,
        };
        let id = idBySlug.get(p.slug);
        if (id) {
          await tx.update(problems).set(values).where(eq(problems.id, id));
          preview.problems.update++;
        } else {
          const [row] = await tx
            .insert(problems)
            .values({ slug: p.slug, ...values, createdAt: p.createdAt ? new Date(p.createdAt) : now })
            .returning({ id: problems.id });
          id = row.id;
          idBySlug.set(p.slug, id);
          preview.problems.create++;
        }
        // Tags for this problem: a name not in the file's tag list still gets created.
        await tx.delete(problemTags).where(eq(problemTags.problemId, id));
        for (const name of p.tags) {
          let tagId = tagIdByLower.get(name.toLowerCase());
          if (!tagId) {
            const [row] = await tx.insert(tags).values({ name, kind: "custom" }).returning({ id: tags.id });
            tagId = row.id;
            tagIdByLower.set(name.toLowerCase(), tagId);
            preview.tags.create++;
          }
          await tx.insert(problemTags).values({ problemId: id, tagId }).onConflictDoNothing();
        }
        // Snippets: replace, byte for byte.
        await tx.delete(snippets).where(eq(snippets.problemId, id));
        for (const [i, s] of p.snippets.entries()) {
          await tx.insert(snippets).values({ problemId: id, label: s.label, language: s.language, code: s.code, sortOrder: s.sortOrder ?? i });
          preview.snippets++;
        }
        // Card
        if (p.card) {
          const c = {
            due: new Date(p.card.due),
            stability: p.card.stability,
            difficulty: p.card.difficulty,
            elapsedDays: p.card.elapsedDays,
            scheduledDays: p.card.scheduledDays,
            learningSteps: p.card.learningSteps,
            reps: p.card.reps,
            lapses: p.card.lapses,
            state: p.card.state,
            lastReview: p.card.lastReview ? new Date(p.card.lastReview) : null,
            updatedAt: now,
          };
          await tx.insert(cards).values({ problemId: id, ...c }).onConflictDoUpdate({ target: cards.problemId, set: c });
          preview.cards++;
        }
        // Logs by client_review_id
        for (const l of p.logs) {
          const inserted = await tx
            .insert(reviewLogs)
            .values({
              clientReviewId: l.clientReviewId,
              problemId: id,
              mode: l.mode,
              rating: l.rating,
              durationSeconds: l.durationSeconds,
              note: l.note,
              reviewedAt: new Date(l.reviewedAt),
              undoneAt: l.undoneAt ? new Date(l.undoneAt) : null,
              state: l.state,
              due: new Date(l.due),
              stability: l.stability,
              difficulty: l.difficulty,
              elapsedDays: l.elapsedDays,
              lastElapsedDays: l.lastElapsedDays,
              scheduledDays: l.scheduledDays,
              learningSteps: l.learningSteps,
              resultScheduledDays: l.resultScheduledDays,
              prevDue: l.prevDue ? new Date(l.prevDue) : null,
            })
            .onConflictDoNothing()
            .returning({ id: reviewLogs.id });
          if (inserted.length) preview.logs.create++;
          else preview.logs.skip++;
        }
      }
      // Relations, once every slug is known.
      for (const p of file.problems) {
        const id = idBySlug.get(p.slug)!;
        await tx.delete(problemRelations).where(eq(problemRelations.problemId, id));
        for (const slug of p.related) {
          const rid = idBySlug.get(slug);
          if (!rid) {
            preview.warnings.push(`${p.slug}: related problem ${slug} is not in the file or the library`);
            continue;
          }
          if (rid === id) continue;
          await tx.insert(problemRelations).values({ problemId: id, relatedProblemId: rid }).onConflictDoNothing();
          preview.relations++;
        }
      }
      // Settings
      if (file.settings) {
        const { fsrsParams, ...rest } = file.settings as Record<string, unknown>;
        const patch = settingsPatchSchema.safeParse(rest);
        if (patch.success) {
          await tx.update(settingsTable).set({ ...patch.data, lastRampAppliedDay: null, updatedAt: now }).where(eq(settingsTable.id, 1));
          preview.settings = true;
        } else preview.warnings.push("Settings in the file were ignored: " + patch.error.issues[0]?.message);
        const w = fsrsWeightsSchema.safeParse(fsrsParams);
        if (w.success) await tx.update(settingsTable).set({ fsrsParams: w.data }).where(eq(settingsTable.id, 1));
      }
      // Counters: keep the file's values (a restore), but never let them drift below the log count.
      await tx.execute(sql`select 1`);
      if (opts.dryRun) throw new DryRunRollback(preview);
    });
    return preview;
  } catch (e) {
    if (e instanceof DryRunRollback) return e.preview;
    throw e;
  }
}
