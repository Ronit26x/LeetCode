"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { requireSession } from "@/lib/session";
import { exportSchema, firstIssue } from "@/lib/validation";
import type { ActionResult } from "@/lib/problems/actions";
import { buildExport, importData, type ImportPreview } from "./core";

export async function exportAll(): Promise<ActionResult<string>> {
  await requireSession();
  const db = await getDb();
  const file = await buildExport(db);
  return { ok: true, data: JSON.stringify(file, null, 2) };
}

function parse(json: string) {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false as const, error: "That file is not valid JSON." };
  }
  const parsed = exportSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: `Not a Recur export: ${firstIssue(parsed.error)}` };
  return { ok: true as const, data: parsed.data };
}

export async function importPreview(json: string): Promise<ActionResult<ImportPreview>> {
  await requireSession();
  const p = parse(json);
  if (!p.ok) return p;
  try {
    const db = await getDb();
    return { ok: true, data: await importData(db, p.data, { dryRun: true }) };
  } catch (e) {
    console.error("[import] preview failed", e);
    return { ok: false, error: "The dry run failed. Nothing was changed." };
  }
}

export async function importApply(json: string): Promise<ActionResult<ImportPreview>> {
  await requireSession();
  const p = parse(json);
  if (!p.ok) return p;
  try {
    const db = await getDb();
    const preview = await importData(db, p.data, { dryRun: false });
    for (const path of ["/today", "/backlog", "/problems", "/stats", "/settings"]) revalidatePath(path);
    return { ok: true, data: preview };
  } catch (e) {
    console.error("[import] apply failed", e);
    return { ok: false, error: "The import failed and was rolled back." };
  }
}
