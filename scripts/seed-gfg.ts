/**
 * Imports data/seed/gfg-backlog.json: core and warmup rows into the backlog, skip rows as archived.
 * Idempotent and non-destructive. Never touches cards or review logs.
 * Usage: pnpm db:seed:gfg [--dry-run] [--file path]   (reads DATABASE_URL from .env.local)
 */
import { existsSync, readFileSync } from "node:fs";

async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fileIdx = args.indexOf("--file");
  const file = fileIdx >= 0 ? args[fileIdx + 1] : "data/seed/gfg-backlog.json";
  const batch = "gfg-2026-09-02";
  const url = process.env.DATABASE_URL ?? "";
  console.log(`database: ${url.replace(/:[^:@/]+@/, ":***@") || "(unset)"}`);

  const { gfgFileSchema, seedGfg, formatSeedSummary } = await import("@/lib/seed/gfg");
  const parsed = gfgFileSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.success) {
    console.error("Invalid seed file:", parsed.error.issues.slice(0, 5));
    process.exit(1);
  }
  const rows = parsed.data;
  const tiers = { core: 0, warmup: 0, skip: 0 };
  for (const r of rows) tiers[r.tier]++;
  console.log(
    `file: ${file}, ${rows.length} rows (core ${tiers.core}, warmup ${tiers.warmup}, skip ${tiers.skip})`,
  );

  const { getDb } = await import("@/db");
  const db = await getDb();
  const summary = await seedGfg(db, rows, { dryRun, batch });
  console.log(formatSeedSummary(summary));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
