// Undo one review log by id through the same core the app uses. Usage: DATABASE_URL=... pnpm exec tsx scripts/undo-log.mts <logId>
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const logId = process.argv[2];
if (!logId) throw new Error("log id required");
const { getDb } = await import("@/db");
const { getSettings } = await import("@/db/bootstrap");
const { applyUndo } = await import("@/lib/review/core");
const { problems } = await import("@/db/schema");
const { eq } = await import("drizzle-orm");
const db = await getDb();
const settings = await getSettings();
const { problemId } = await applyUndo(db, settings, logId, new Date());
const row = await db.query.problems.findFirst({
  where: eq(problems.id, problemId),
  with: { card: true },
});
console.log(
  `undone: ${row?.title} -> status ${row?.status}, card ${row?.card ? "present" : "none"}, revised ${row?.reviseCount}, resolved ${row?.resolveCount}`,
);
process.exit(0);
