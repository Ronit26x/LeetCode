// Concurrent server-side paths against a real Postgres, the way a page render issues them.
// Usage: NODE_OPTIONS=--conditions=react-server DATABASE_URL=<url> pnpm exec tsx scripts/stress.mts [iterations]
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
const { getDb } = await import("@/db");
const { problems } = await import("@/db/schema");
const { ensureDefaults, getSettings } = await import("@/db/bootstrap");
const { applyFirstSolve } = await import("@/lib/fsrs/grade");
const { applyGrade, applyUndo, previewFor } = await import("@/lib/review/core");
const { getProblem, listTags, listProblems } = await import("@/lib/problems/queries");
const { getTodayQueue } = await import("@/lib/queue/build");

const N = Number(process.argv[2] ?? 15);
const db = await getDb();
await ensureDefaults();
const settings = await getSettings();
async function guarded<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  const timer = new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`HANG in "${name}"`)), 25_000));
  const out = await Promise.race([fn(), timer]);
  const ms = Date.now() - t0;
  if (ms > 3000) console.log(`  slow: ${name} ${ms}ms`);
  return out;
}
for (let i = 0; i < N; i++) {
  const slug = `stress-${randomUUID().slice(0, 8)}`;
  const [p] = await guarded("insert", () => db.insert(problems).values({ slug, title: "Stress", difficulty: "medium" }).returning());
  const now = new Date();
  await guarded("first solve", () => db.transaction((tx) => applyFirstSolve(tx, p.id, 3, now, settings)));
  await guarded("render problem page", () => Promise.all([getProblem(p.id), listTags(), getSettings()]));
  await guarded("render session", () => Promise.all([getTodayQueue(new Date()), getProblem(p.id), listTags()]));
  const later = new Date(now.getTime() + 2 * 86_400_000);
  await guarded("preview", () => previewFor(db, settings, p.id, later));
  const g = await guarded("grade", () => applyGrade(db, settings, { problemId: p.id, clientReviewId: randomUUID(), rating: 3, mode: "revise", durationSeconds: null, note: null, appendNoteToPitfalls: false }, later));
  await guarded("render after grade", () => Promise.all([getProblem(p.id), listTags(), listProblems({})]));
  await guarded("undo", () => applyUndo(db, settings, g.logId, new Date(later.getTime() + 1000)));
  await guarded("render after undo", () => Promise.all([getProblem(p.id), listTags(), getTodayQueue(new Date())]));
  await guarded("delete", () => db.delete(problems).where(eq(problems.id, p.id)));
  console.log(`iteration ${i + 1} ok`);
}
console.log("stress complete");
process.exit(0);
