// Exercises the real database path end to end: bootstrap, create, first solve, preview, grade,
// undo, delete. Leaves no data behind. Usage: DATABASE_URL=<supabase tx url> pnpm exec tsx scripts/verify-live.mts
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
const { getDb } = await import("@/db");
const { problems, reviewLogs, tags } = await import("@/db/schema");
const { ensureDefaults, getSettings } = await import("@/db/bootstrap");
const { applyFirstSolve } = await import("@/lib/fsrs/grade");
const { applyGrade, applyUndo, previewFor } = await import("@/lib/review/core");

const db = await getDb();
await ensureDefaults();
const settings = await getSettings();
const tagCount = (await db.select().from(tags)).length;
console.log(
  `settings ok (tz ${settings.timezone}, start ${settings.dayStartHour}, interview ${settings.interviewDate}); tags: ${tagCount}`,
);

const slug = `verify-${randomUUID().slice(0, 8)}`;
const [p] = await db
  .insert(problems)
  .values({ slug, title: "Verification problem", difficulty: "medium" })
  .returning();
const now = new Date();
await db.transaction((tx) => applyFirstSolve(tx, p.id, 3, now, settings));
const later = new Date(now.getTime() + 3 * 86_400_000);
const preview = await previewFor(db, settings, p.id, later);
const grade = await applyGrade(
  db,
  settings,
  {
    problemId: p.id,
    clientReviewId: randomUUID(),
    rating: 3,
    mode: "revise",
    durationSeconds: null,
    note: null,
    appendNoteToPitfalls: false,
  },
  later,
);
const dup = await applyGrade(
  db,
  settings,
  {
    problemId: p.id,
    clientReviewId: randomUUID(),
    rating: 3,
    mode: "revise",
    durationSeconds: null,
    note: null,
    appendNoteToPitfalls: false,
  },
  later,
);
console.log(
  `first solve ok; preview good=${preview[3]}d; grade scheduled=${grade.scheduledDays}d duplicate=${grade.duplicate}; second grade duplicate=${dup.duplicate}`,
);
await applyUndo(db, settings, dup.logId, new Date(later.getTime() + 1000));
await applyUndo(db, settings, grade.logId, new Date(later.getTime() + 2000));
const row = await db.query.problems.findFirst({
  where: eq(problems.id, p.id),
  with: { card: true },
});
const logs = await db.select().from(reviewLogs).where(eq(reviewLogs.problemId, p.id));
console.log(
  `undo ok: reviseCount=${row?.reviseCount} resolveCount=${row?.resolveCount} reps=${row?.card?.reps} logs=${logs.length} undone=${logs.filter((l) => l.undoneAt).length}`,
);
await db.delete(problems).where(eq(problems.id, p.id));
const left = await db.select().from(reviewLogs).where(eq(reviewLogs.problemId, p.id));
console.log(`cleanup ok: logs left=${left.length}`);
process.exit(0);
