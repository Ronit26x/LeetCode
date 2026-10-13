"use server";

import { getDb } from "@/db";
import { getSettings } from "@/db/bootstrap";
import { requireSession } from "@/lib/session";
import { reviewDayKey } from "@/lib/day";
import { firstIssue, roadmapMarkSchema } from "@/lib/validation";
import { ROADMAP_NUMBERS } from "@/lib/roadmap/data";
import { applyRoadmapMark } from "@/lib/roadmap/core";
import type { RoadmapMark } from "@/lib/roadmap/marks";
import type { ActionResult } from "@/lib/problems/actions";

/** Done, redo or clear (null) on one roadmap problem. Returns the stored mark. */
export async function setRoadmapMark(raw: unknown): Promise<ActionResult<RoadmapMark | null>> {
  await requireSession();
  const parsed = roadmapMarkSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { number, status } = parsed.data;
  if (!ROADMAP_NUMBERS.has(number))
    return { ok: false, error: "That problem is not on the roadmap." };
  const [db, settings] = await Promise.all([getDb(), getSettings()]);
  const today = reviewDayKey(new Date(), settings.timezone, settings.dayStartHour);
  const mark = await applyRoadmapMark(db, number, status, today);
  return { ok: true, data: mark };
}
