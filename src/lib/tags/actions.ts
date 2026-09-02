"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { problemTags, tags } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { firstIssue, tagInputSchema, updateTagSchema } from "@/lib/validation";
import { z } from "zod";
import type { ActionResult } from "@/lib/problems/actions";

function revalidateAll() {
  revalidatePath("/settings");
  revalidatePath("/problems");
  revalidatePath("/backlog");
  revalidatePath("/today");
}

export async function createTag(
  raw: z.input<typeof tagInputSchema>,
): Promise<ActionResult<{ id: string }>> {
  await requireSession();
  const db = await getDb();
  const parsed = tagInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const dupe = await db.query.tags.findFirst({
    where: sql`lower(${tags.name}) = ${parsed.data.name.toLowerCase()}`,
  });
  if (dupe) return { ok: false, error: `A tag named ${dupe.name} already exists.` };
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${tags.sortOrder}), -1)::int` })
    .from(tags);
  const [row] = await db
    .insert(tags)
    .values({ ...parsed.data, sortOrder: max + 1 })
    .returning({ id: tags.id });
  revalidateAll();
  return { ok: true, data: { id: row.id } };
}

export async function updateTag(raw: z.input<typeof updateTagSchema>): Promise<ActionResult> {
  await requireSession();
  const db = await getDb();
  const parsed = updateTagSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { id, ...patch } = parsed.data;
  if (patch.name) {
    const dupe = await db.query.tags.findFirst({
      where: sql`lower(${tags.name}) = ${patch.name.toLowerCase()} and ${tags.id} <> ${id}`,
    });
    if (dupe) return { ok: false, error: `A tag named ${dupe.name} already exists.` };
  }
  await db
    .update(tags)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(tags.id, id));
  revalidateAll();
  return { ok: true, data: null };
}

export async function deleteTag(rawId: string): Promise<ActionResult> {
  await requireSession();
  const db = await getDb();
  const id = z.uuid().safeParse(rawId);
  if (!id.success) return { ok: false, error: "Invalid id" };
  await db.delete(tags).where(eq(tags.id, id.data));
  revalidateAll();
  return { ok: true, data: null };
}

/** Moves every problem from `sourceId` onto `targetId`, then deletes the source. */
export async function mergeTags(rawSource: string, rawTarget: string): Promise<ActionResult> {
  await requireSession();
  const db = await getDb();
  const ids = z.tuple([z.uuid(), z.uuid()]).safeParse([rawSource, rawTarget]);
  if (!ids.success) return { ok: false, error: "Invalid ids" };
  const [sourceId, targetId] = ids.data;
  if (sourceId === targetId) return { ok: false, error: "Pick two different tags." };
  await db.transaction(async (tx) => {
    const rows = await tx
      .select({ problemId: problemTags.problemId })
      .from(problemTags)
      .where(eq(problemTags.tagId, sourceId));
    if (rows.length) {
      await tx
        .insert(problemTags)
        .values(rows.map((r) => ({ problemId: r.problemId, tagId: targetId })))
        .onConflictDoNothing();
    }
    await tx.delete(tags).where(eq(tags.id, sourceId));
  });
  revalidateAll();
  return { ok: true, data: null };
}

export async function reorderTags(rawIds: string[]): Promise<ActionResult> {
  await requireSession();
  const db = await getDb();
  const ids = z.array(z.uuid()).max(500).safeParse(rawIds);
  if (!ids.success) return { ok: false, error: "Invalid ids" };
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.data.entries()) {
      await tx.update(tags).set({ sortOrder: i }).where(eq(tags.id, id));
    }
  });
  revalidateAll();
  return { ok: true, data: null };
}
