// Runs the server-side code paths against a real Postgres with a pool of ONE connection.
// A leaked connection makes the next step hang, so each step gets a watchdog.
// Usage: DATABASE_URL=<postgres url> pnpm exec tsx scripts/leak-check.mts
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
process.env.RECUR_PG_MAX = "1";
const { getDb } = await import("@/db");
const { problems } = await import("@/db/schema");
const { ensureDefaults, getSettings } = await import("@/db/bootstrap");
const { applyFirstSolve } = await import("@/lib/fsrs/grade");
const { applyGrade, applyUndo, previewFor } = await import("@/lib/review/core");
const {
  getProblem,
  listProblems,
  listTags,
  listTagsWithCounts,
  searchProblemsBrief,
  countByStatus,
} = await import("@/lib/problems/queries");
const { getTodayQueue } = await import("@/lib/queue/build");
const { getStats } = await import("@/lib/stats/queries");
const { buildExport, importData } = await import("@/lib/data/core");

const db = await getDb();
async function step<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  const timer = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error(`HANG in step "${name}"`)), 20_000),
  );
  const out = await Promise.race([fn(), timer]);
  console.log(`ok ${name} (${Date.now() - t0}ms)`);
  return out;
}

await step("bootstrap", () => ensureDefaults());
const settings = await step("settings", () => getSettings());
const slug = `leak-${randomUUID().slice(0, 8)}`;
const [p] = await step("insert", () =>
  db.insert(problems).values({ slug, title: "Leak check", difficulty: "easy" }).returning(),
);
const now = new Date();
await step("first solve (tx)", () =>
  db.transaction((tx) => applyFirstSolve(tx, p.id, 3, now, settings)),
);
await step("getProblem (relational)", () => getProblem(p.id));
await step("listProblems", () => listProblems({}));
await step("listTags", () => listTags());
await step("listTagsWithCounts", () => listTagsWithCounts());
await step("search", () => searchProblemsBrief("leak"));
await step("countByStatus", () => countByStatus());
await step("queue", () => getTodayQueue(new Date()));
await step("stats", () => getStats());
const later = new Date(now.getTime() + 2 * 86_400_000);
await step("preview", () => previewFor(db, settings, p.id, later));
const g = await step("grade (tx)", () =>
  applyGrade(
    db,
    settings,
    {
      problemId: p.id,
      clientReviewId: randomUUID(),
      rating: 1,
      mode: "revise",
      durationSeconds: null,
      note: null,
      appendNoteToPitfalls: false,
    },
    later,
  ),
);
await step("undo (tx)", () => applyUndo(db, settings, g.logId, new Date(later.getTime() + 1000)));
const file = await step("export", () => buildExport(db));
await step("import dry run (tx rollback)", () => importData(db, file, { dryRun: true }));
await step("getProblem again", () => getProblem(p.id));
await step("delete", () => db.delete(problems).where(eq(problems.id, p.id)));
await step("final select", () => db.select().from(problems));
console.log("no leak detected");
process.exit(0);
