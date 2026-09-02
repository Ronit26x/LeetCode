"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { getSettings } from "@/db/bootstrap";
import { requireSession } from "@/lib/session";
import { firstIssue, gradeInputSchema, type GradeInput } from "@/lib/validation";
import type { ActionResult } from "@/lib/problems/actions";
import {
  annotateLog,
  applyGrade,
  applyUndo,
  previewFor,
  ReviewError,
  type GradePreview,
  type GradeResult,
} from "./core";

function revalidate(problemId: string) {
  revalidatePath("/today");
  revalidatePath("/review");
  revalidatePath("/problems");
  revalidatePath("/stats");
  revalidatePath(`/problems/${problemId}`);
}

function message(e: unknown, fallback: string) {
  return e instanceof ReviewError ? e.message : fallback;
}

export async function previewGrades(input: {
  problemId: string;
  now: string;
}): Promise<ActionResult<GradePreview>> {
  await requireSession();
  const parsed = z.object({ problemId: z.uuid(), now: z.iso.datetime() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  try {
    const db = await getDb();
    const settings = await getSettings();
    return {
      ok: true,
      data: await previewFor(db, settings, parsed.data.problemId, new Date(parsed.data.now)),
    };
  } catch (e) {
    console.error("[review] preview failed", e);
    return { ok: false, error: message(e, "Could not compute intervals.") };
  }
}

export async function gradeCard(raw: GradeInput): Promise<ActionResult<GradeResult>> {
  await requireSession();
  const parsed = gradeInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const input = parsed.data;
  const now = new Date(input.now);
  // Never let a skewed client clock schedule from the future or the distant past.
  const at = Math.abs(now.getTime() - Date.now()) > 10 * 60_000 ? new Date() : now;
  try {
    const db = await getDb();
    const settings = await getSettings();
    const result = await applyGrade(
      db,
      settings,
      {
        problemId: input.problemId,
        clientReviewId: input.clientReviewId,
        rating: input.rating,
        mode: input.mode,
        durationSeconds: input.durationSeconds,
        note: input.note,
        appendNoteToPitfalls: input.appendNoteToPitfalls,
      },
      at,
    );
    revalidate(input.problemId);
    return { ok: true, data: result };
  } catch (e) {
    console.error("[review] grade failed", e);
    return { ok: false, error: message(e, "Could not save the grade.") };
  }
}

export async function undoGrade(raw: {
  logId: string;
}): Promise<ActionResult<{ problemId: string }>> {
  await requireSession();
  const parsed = z.object({ logId: z.uuid() }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  try {
    const db = await getDb();
    const settings = await getSettings();
    const result = await applyUndo(db, settings, parsed.data.logId, new Date());
    revalidate(result.problemId);
    return { ok: true, data: result };
  } catch (e) {
    console.error("[review] undo failed", e);
    return { ok: false, error: message(e, "Could not undo.") };
  }
}

export async function annotateGrade(raw: {
  logId: string;
  note: string;
  appendToPitfalls: boolean;
}): Promise<ActionResult> {
  await requireSession();
  const parsed = z
    .object({ logId: z.uuid(), note: z.string().trim().max(2000), appendToPitfalls: z.boolean() })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  try {
    const db = await getDb();
    await annotateLog(db, parsed.data.logId, parsed.data.note, parsed.data.appendToPitfalls);
    revalidatePath("/problems");
    return { ok: true, data: null };
  } catch (e) {
    console.error("[review] annotate failed", e);
    return { ok: false, error: message(e, "Could not save the note.") };
  }
}
