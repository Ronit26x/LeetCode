"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { getDb, type Tx } from "@/db";
import {
  cards,
  problemRelations,
  problems,
  problemTags,
  reviewLogs,
  snippets,
  tags,
} from "@/db/schema";
import { getSettings } from "@/db/bootstrap";
import { requireSession } from "@/lib/session";
import { fetchLeetCodeQuestion, mapTopicTags, parseLeetCodeInput } from "@/lib/leetcode";
import { applyFirstSolve } from "@/lib/fsrs/grade";
import { logToRow, cardToRow, rowToCard } from "@/lib/fsrs/core";
import { schedulerForNow } from "@/lib/fsrs/scheduler";
import {
  createProblemSchema,
  firstIssue,
  idListSchema,
  markSolvedSchema,
  updateProblemSchema,
  type CreateProblemInput,
  type UpdateProblemInput,
} from "@/lib/validation";
import { z } from "zod";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

function revalidateProblemPaths(id?: string) {
  revalidatePath("/today");
  revalidatePath("/backlog");
  revalidatePath("/problems");
  revalidatePath("/stats");
  if (id) revalidatePath(`/problems/${id}`);
}

export interface PrefillResult {
  slug: string;
  url: string;
  number: number | null;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  matchedTagIds: string[];
  suggestedNewTags: string[];
  existingProblemId: string | null;
}

/** Prefill from LeetCode. Times out at 4 s and reports the failure; the form falls back to manual entry. */
export async function prefillFromLeetCode(input: string): Promise<ActionResult<PrefillResult>> {
  await requireSession();
  const db = await getDb();
  const parsed = parseLeetCodeInput(input);
  if (!parsed) return fail("Paste a LeetCode problem URL or a slug like two-sum.");
  const existing = await db.query.problems.findFirst({
    where: eq(problems.slug, parsed.slug),
    columns: { id: true },
  });
  try {
    const [q, tagRows] = await Promise.all([
      fetchLeetCodeQuestion(parsed.slug),
      db.select().from(tags),
    ]);
    const mapped = mapTopicTags(q.topicTags, tagRows);
    return {
      ok: true,
      data: {
        slug: q.slug,
        url: q.url,
        number: q.number,
        title: q.title,
        difficulty: q.difficulty,
        matchedTagIds: mapped.matched.map((t) => t.id),
        suggestedNewTags: mapped.unmatched,
        existingProblemId: existing?.id ?? null,
      },
    };
  } catch (e) {
    console.warn("[leetcode] prefill failed", parsed.slug, e instanceof Error ? e.message : e);
    return {
      ok: false,
      error: `Could not reach LeetCode for ${parsed.slug}. Fill in the title yourself.`,
    };
  }
}

async function ensureTags(tx: Tx, tagIds: string[], newTags: string[]): Promise<string[]> {
  const ids = new Set(tagIds);
  for (const raw of newTags) {
    const name = raw.trim();
    if (!name) continue;
    const found = await tx.query.tags.findFirst({
      where: sql`lower(${tags.name}) = ${name.toLowerCase()}`,
    });
    if (found) {
      ids.add(found.id);
      continue;
    }
    const [created] = await tx
      .insert(tags)
      .values({ name, kind: "custom", color: "stone" })
      .returning();
    ids.add(created.id);
  }
  if (ids.size === 0) return [];
  const valid = await tx
    .select({ id: tags.id })
    .from(tags)
    .where(inArray(tags.id, [...ids]));
  return valid.map((v) => v.id);
}

async function replaceTags(tx: Tx, problemId: string, tagIds: string[]) {
  await tx.delete(problemTags).where(eq(problemTags.problemId, problemId));
  if (tagIds.length) {
    await tx
      .insert(problemTags)
      .values(tagIds.map((tagId) => ({ problemId, tagId })))
      .onConflictDoNothing();
  }
}

async function replaceRelations(tx: Tx, problemId: string, relatedIds: string[]) {
  await tx.delete(problemRelations).where(eq(problemRelations.problemId, problemId));
  const ids = [...new Set(relatedIds)].filter((id) => id !== problemId);
  if (ids.length === 0) return;
  const valid = await tx
    .select({ id: problems.id })
    .from(problems)
    .where(inArray(problems.id, ids));
  if (valid.length) {
    await tx
      .insert(problemRelations)
      .values(valid.map((v) => ({ problemId, relatedProblemId: v.id })))
      .onConflictDoNothing();
  }
}

type SnippetInput = {
  id?: string;
  label: string;
  language: "cpp" | "python" | "java" | "text";
  code: string;
  sortOrder: number;
};

/** Replace-set semantics: snippets not in the list are deleted; the rest are upserted by id. Code is stored as-is. */
async function replaceSnippets(tx: Tx, problemId: string, list: SnippetInput[]) {
  const keep = list.map((s) => s.id).filter((id): id is string => !!id);
  if (keep.length) {
    await tx
      .delete(snippets)
      .where(and(eq(snippets.problemId, problemId), notInArray(snippets.id, keep)));
  } else {
    await tx.delete(snippets).where(eq(snippets.problemId, problemId));
  }
  for (const [i, s] of list.entries()) {
    const values = {
      problemId,
      label: s.label,
      language: s.language,
      code: s.code,
      sortOrder: s.sortOrder ?? i,
    };
    if (s.id) {
      await tx
        .insert(snippets)
        .values({ id: s.id, ...values })
        .onConflictDoUpdate({ target: snippets.id, set: { ...values, updatedAt: new Date() } });
    } else {
      await tx.insert(snippets).values(values);
    }
  }
}

export async function createProblem(
  raw: CreateProblemInput,
): Promise<ActionResult<{ id: string }>> {
  await requireSession();
  const db = await getDb();
  const parsed = createProblemSchema.safeParse(raw);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const input = parsed.data;
  const now = new Date();
  const slug = input.slug?.trim()
    ? input.slug.trim().toLowerCase()
    : `manual-${randomUUID().slice(0, 8)}`;

  const existing = await db.query.problems.findFirst({
    where: eq(problems.slug, slug),
    columns: { id: true, title: true },
  });
  if (existing) return fail(`${existing.title} is already in your library.`);

  const settings = await getSettings();
  try {
    const id = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(problems)
        .values({
          slug,
          leetcodeNumber: input.leetcodeNumber,
          title: input.title,
          url: input.url,
          difficulty: input.difficulty,
          status: "backlog",
          promptSummary: input.promptSummary,
          keyInsight: input.keyInsight,
          approach: input.approach,
          timeComplexity: input.timeComplexity,
          spaceComplexity: input.spaceComplexity,
          pitfalls: input.pitfalls,
          notes: input.notes,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: problems.id });
      const tagIds = await ensureTags(tx, input.tagIds, input.newTags);
      await replaceTags(tx, created.id, tagIds);
      await replaceRelations(tx, created.id, input.relatedIds);
      await replaceSnippets(tx, created.id, input.snippets);
      if (input.outcome.kind === "solved") {
        await applyFirstSolve(tx, created.id, input.outcome.rating, now, settings, {
          clientReviewId: input.outcome.clientReviewId,
          durationSeconds: input.outcome.durationSeconds,
        });
      }
      return created.id;
    });
    revalidateProblemPaths(id);
    return { ok: true, data: { id } };
  } catch (e) {
    console.error("[problems] create failed", e);
    return fail("Could not save the problem. Try again.");
  }
}

export async function updateProblem(raw: UpdateProblemInput): Promise<ActionResult> {
  await requireSession();
  const db = await getDb();
  const parsed = updateProblemSchema.safeParse(raw);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { id, snippets: snippetList, tagIds, newTags, relatedIds, slug, ...fields } = parsed.data;
  const now = new Date();
  try {
    await db.transaction(async (tx) => {
      const patch: Record<string, unknown> = { updatedAt: now };
      for (const [k, v] of Object.entries(fields)) if (v !== undefined) patch[k] = v;
      if (slug !== undefined && slug !== null && slug.trim())
        patch.slug = slug.trim().toLowerCase();
      await tx.update(problems).set(patch).where(eq(problems.id, id));
      if (tagIds !== undefined || newTags !== undefined) {
        const current =
          tagIds ??
          (
            await tx
              .select({ tagId: problemTags.tagId })
              .from(problemTags)
              .where(eq(problemTags.problemId, id))
          ).map((r) => r.tagId);
        const ids = await ensureTags(tx, current, newTags ?? []);
        await replaceTags(tx, id, ids);
      }
      if (relatedIds !== undefined) await replaceRelations(tx, id, relatedIds);
      if (snippetList !== undefined) await replaceSnippets(tx, id, snippetList);
    });
    revalidateProblemPaths(id);
    return { ok: true, data: null };
  } catch (e) {
    console.error("[problems] update failed", e);
    return fail(
      e instanceof Error && /unique/i.test(e.message)
        ? "That slug is already used by another problem."
        : "Could not save changes. Try again.",
    );
  }
}

/** From the backlog: create the card and log the first rating as resolve #1. */
export async function markSolved(
  raw: z.input<typeof markSolvedSchema>,
): Promise<ActionResult<{ scheduledDays: number }>> {
  await requireSession();
  const db = await getDb();
  const parsed = markSolvedSchema.safeParse(raw);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { id, rating, durationSeconds, clientReviewId } = parsed.data;
  const now = new Date();
  const settings = await getSettings();
  try {
    const result = await db.transaction(async (tx) => {
      const problem = await tx.query.problems.findFirst({
        where: eq(problems.id, id),
        with: { card: true },
      });
      if (!problem) throw new Error("Problem not found");
      if (problem.card && problem.status !== "backlog")
        throw new Error("This problem is already scheduled");
      return applyFirstSolve(tx, id, rating, now, settings, { clientReviewId, durationSeconds });
    });
    revalidateProblemPaths(id);
    return { ok: true, data: { scheduledDays: result.card.scheduled_days } };
  } catch (e) {
    console.error("[problems] markSolved failed", e);
    return fail(e instanceof Error ? e.message : "Could not mark as solved.");
  }
}

async function setStatus(ids: string[], status: "active" | "suspended" | "archived" | "backlog") {
  const db = await getDb();
  await db.update(problems).set({ status, updatedAt: new Date() }).where(inArray(problems.id, ids));
}

export async function suspendProblems(rawIds: string[]): Promise<ActionResult> {
  await requireSession();
  const ids = idListSchema.safeParse(rawIds);
  if (!ids.success) return fail("Nothing selected");
  await setStatus(ids.data, "suspended");
  revalidateProblemPaths();
  ids.data.forEach((id) => revalidatePath(`/problems/${id}`));
  return { ok: true, data: null };
}

/** Unsuspend leaves `due` untouched; an overdue card just shows as overdue. */
export async function unsuspendProblems(rawIds: string[]): Promise<ActionResult> {
  await requireSession();
  const db = await getDb();
  const ids = idListSchema.safeParse(rawIds);
  if (!ids.success) return fail("Nothing selected");
  const withCard = await db
    .select({ id: problems.id })
    .from(problems)
    .innerJoin(cards, eq(cards.problemId, problems.id))
    .where(inArray(problems.id, ids.data));
  const withoutCard = ids.data.filter((id) => !withCard.some((w) => w.id === id));
  if (withCard.length)
    await setStatus(
      withCard.map((w) => w.id),
      "active",
    );
  if (withoutCard.length) await setStatus(withoutCard, "backlog");
  revalidateProblemPaths();
  ids.data.forEach((id) => revalidatePath(`/problems/${id}`));
  return { ok: true, data: null };
}

export async function archiveProblems(rawIds: string[]): Promise<ActionResult> {
  await requireSession();
  const ids = idListSchema.safeParse(rawIds);
  if (!ids.success) return fail("Nothing selected");
  await setStatus(ids.data, "archived");
  revalidateProblemPaths();
  ids.data.forEach((id) => revalidatePath(`/problems/${id}`));
  return { ok: true, data: null };
}

/** Reset the memory state with ts-fsrs `forget`. Writes a Manual (0) log that counters and stats ignore. */
export async function resetCards(rawIds: string[]): Promise<ActionResult> {
  await requireSession();
  const db = await getDb();
  const ids = idListSchema.safeParse(rawIds);
  if (!ids.success) return fail("Nothing selected");
  const now = new Date();
  const settings = await getSettings();
  const { f } = schedulerForNow(settings, now);
  try {
    await db.transaction(async (tx) => {
      const rows = await tx.select().from(cards).where(inArray(cards.problemId, ids.data));
      for (const row of rows) {
        const { card, log } = f.forget(rowToCard(row), now, true);
        await tx
          .update(cards)
          .set({ ...cardToRow(card), updatedAt: now })
          .where(eq(cards.problemId, row.problemId));
        await tx.insert(reviewLogs).values({
          clientReviewId: randomUUID(),
          problemId: row.problemId,
          mode: "revise",
          durationSeconds: null,
          note: "Reset",
          ...logToRow(log),
          resultScheduledDays: 0,
        });
      }
    });
    revalidateProblemPaths();
    ids.data.forEach((id) => revalidatePath(`/problems/${id}`));
    return { ok: true, data: null };
  } catch (e) {
    console.error("[problems] reset failed", e);
    return fail("Could not reset. Try again.");
  }
}

export async function deleteProblem(rawId: string): Promise<ActionResult> {
  await requireSession();
  const db = await getDb();
  const id = z.uuid().safeParse(rawId);
  if (!id.success) return fail("Invalid id");
  await db.delete(problems).where(eq(problems.id, id.data));
  revalidateProblemPaths();
  return { ok: true, data: null };
}

export async function addTagsToProblems(
  rawIds: string[],
  rawTagIds: string[],
): Promise<ActionResult> {
  await requireSession();
  const db = await getDb();
  const ids = idListSchema.safeParse(rawIds);
  const tagIds = idListSchema.safeParse(rawTagIds);
  if (!ids.success || !tagIds.success) return fail("Nothing selected");
  const values = ids.data.flatMap((problemId) =>
    tagIds.data.map((tagId) => ({ problemId, tagId })),
  );
  await db.insert(problemTags).values(values).onConflictDoNothing();
  revalidateProblemPaths();
  return { ok: true, data: null };
}

export async function searchProblems(q: string) {
  await requireSession();
  const { searchProblemsBrief } = await import("./queries");
  return searchProblemsBrief(q);
}
