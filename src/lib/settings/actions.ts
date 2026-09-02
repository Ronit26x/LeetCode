"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { checkParameters } from "ts-fsrs";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { DEFAULT_FSRS_W } from "@/db/defaults";
import { getSettings } from "@/db/bootstrap";
import { requireSession } from "@/lib/session";
import { firstIssue, fsrsWeightsSchema, settingsPatchSchema, type SettingsPatch } from "@/lib/validation";
import type { ActionResult } from "@/lib/problems/actions";

function revalidateAll() {
  for (const p of ["/settings", "/today", "/review", "/problems", "/stats", "/backlog"]) revalidatePath(p);
}

export async function updateSettings(raw: SettingsPatch): Promise<ActionResult> {
  await requireSession();
  const parsed = settingsPatchSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const patch = parsed.data;
  if (patch.retentionRampTarget !== undefined || patch.desiredRetention !== undefined) {
    const current = await getSettings();
    const base = patch.desiredRetention ?? current.desiredRetention;
    const target = patch.retentionRampTarget ?? current.retentionRampTarget;
    if (target < base) return { ok: false, error: "The ramp target must be at least the desired retention." };
  }
  const db = await getDb();
  // A changed day boundary or timezone means the ramp pass should run again on the next request.
  const extra = patch.timezone !== undefined || patch.dayStartHour !== undefined || patch.retentionRampEnabled !== undefined || patch.retentionRampDays !== undefined || patch.retentionRampTarget !== undefined || patch.interviewDate !== undefined ? { lastRampAppliedDay: null } : {};
  await db.update(settings).set({ ...patch, ...extra, updatedAt: new Date() }).where(eq(settings.id, 1));
  revalidateAll();
  return { ok: true, data: null };
}

export async function updateFsrsWeights(raw: unknown): Promise<ActionResult> {
  await requireSession();
  const parsed = fsrsWeightsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  try {
    checkParameters(parsed.data);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid weights" };
  }
  const db = await getDb();
  await db.update(settings).set({ fsrsParams: parsed.data, updatedAt: new Date() }).where(eq(settings.id, 1));
  revalidateAll();
  return { ok: true, data: null };
}

export async function resetFsrsWeights(): Promise<ActionResult> {
  await requireSession();
  const db = await getDb();
  await db.update(settings).set({ fsrsParams: DEFAULT_FSRS_W, updatedAt: new Date() }).where(eq(settings.id, 1));
  revalidateAll();
  return { ok: true, data: null };
}
