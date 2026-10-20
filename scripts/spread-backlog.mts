/**
 * Spreads the review backlog: every active card's due date moves later by the same number of
 * days, so the oldest overdue review lands tomorrow and the rest follow in order, one day's worth
 * at a time. Only `due` moves; stability, intervals and review logs are untouched.
 *
 * Usage: DATABASE_URL=<url> pnpm db:spread-backlog [--dry-run] [--days N] [--backup file.json]
 *   --dry-run   report the shift and the before/after counts per review day, write nothing
 *   --days N    use N days instead of the computed shift; negative moves cards earlier, so the
 *               same number negated undoes a spread made the same day
 *   --backup    write every move (problem id, slug, old and new due) to a JSON file first
 * Reads DATABASE_URL from .env.local when it is not set in the environment.
 */
import { existsSync, writeFileSync } from "node:fs";

async function main() {
  if (!process.env.DATABASE_URL && existsSync(".env.local")) process.loadEnvFile(".env.local");
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const daysIdx = args.indexOf("--days");
  const days = daysIdx >= 0 ? Number(args[daysIdx + 1]) : undefined;
  if (days !== undefined && !Number.isInteger(days)) {
    console.error("--days needs a whole number");
    process.exit(1);
  }
  const backupIdx = args.indexOf("--backup");
  const backup = backupIdx >= 0 ? args[backupIdx + 1] : null;
  const url = process.env.DATABASE_URL ?? "";
  console.log(`database: ${url.replace(/:[^:@/]+@/, ":***@") || "(unset)"}`);

  const { getDb } = await import("@/db");
  const { getSettings } = await import("@/db/bootstrap");
  const { spreadBacklog } = await import("@/lib/queue/spread");
  const db = await getDb();
  const settings = await getSettings();
  const now = new Date();

  const preview = await spreadBacklog(db, settings, now, { apply: false, days });
  console.log(
    `review day ${preview.today} (${settings.timezone}, day starts ${settings.dayStartHour}:00); ${preview.moves.length} active cards`,
  );
  if (preview.shiftDays === 0) {
    console.log("nothing is due by today, so there is nothing to spread");
    process.exit(0);
  }
  console.log(`shift: ${preview.shiftDays > 0 ? "+" : ""}${preview.shiftDays} days`);
  const daysOf = (h: Record<string, number>) => Object.keys(h);
  const allDays = [...new Set([...daysOf(preview.before), ...daysOf(preview.after)])].sort();
  console.log("review day    before  after");
  for (const d of allDays) {
    const b = preview.before[d] ?? 0;
    const a = preview.after[d] ?? 0;
    console.log(`${d}  ${String(b).padStart(6)}  ${String(a).padStart(5)}`);
  }
  if (backup) {
    writeFileSync(
      backup,
      JSON.stringify(
        {
          database: url.replace(/:[^:@/]+@/, ":***@"),
          at: now.toISOString(),
          today: preview.today,
          shiftDays: preview.shiftDays,
          moves: preview.moves.map((m) => ({
            problemId: m.problemId,
            slug: m.slug,
            from: m.from.toISOString(),
            to: m.to.toISOString(),
          })),
        },
        null,
        2,
      ),
    );
    console.log(`backup written to ${backup}`);
  }
  if (dryRun) {
    console.log("dry run: nothing written");
    process.exit(0);
  }
  const result = await spreadBacklog(db, settings, now, { apply: true, days });
  console.log(`done: ${result.changed} cards moved by ${result.shiftDays} days`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
