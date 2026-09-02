import { sql } from "drizzle-orm";
import { db } from "./index";
import { settings, tags, type Settings } from "./schema";
import { DEFAULT_SETTINGS, DEFAULT_TOPIC_TAGS } from "./defaults";

let bootstrapped: Promise<void> | null = null;

/** Idempotent first-run setup: the single settings row and the default topic tags. */
export function ensureDefaults(): Promise<void> {
  bootstrapped ??= (async () => {
    await db
      .insert(settings)
      .values({ id: 1, ...DEFAULT_SETTINGS })
      .onConflictDoNothing();
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(tags);
    if (count === 0) {
      await db
        .insert(tags)
        .values(DEFAULT_TOPIC_TAGS.map((t, i) => ({ ...t, kind: "topic" as const, sortOrder: i })))
        .onConflictDoNothing();
    }
  })().catch((e) => {
    bootstrapped = null;
    throw e;
  });
  return bootstrapped;
}

export async function getSettings(): Promise<Settings> {
  await ensureDefaults();
  const row = await db.query.settings.findFirst();
  if (!row) throw new Error("Settings row missing after bootstrap");
  return row;
}
