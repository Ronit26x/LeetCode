import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { eq, sql } from "drizzle-orm";
import { freshDb } from "../helpers/db";
import type { Db } from "@/db";
import { cards, problemRelations, problems, problemTags, reviewLogs, tags } from "@/db/schema";
import { ensureDefaults } from "@/db/bootstrap";
import { gfgFileSchema, seedGfg } from "@/lib/seed/gfg";

let db: Db;
const rows = gfgFileSchema.parse(JSON.parse(readFileSync("data/seed/gfg-backlog.json", "utf8")));
const batch = "gfg-test";

beforeAll(async () => {
  db = await freshDb();
  await ensureDefaults();
});

describe("GFG seed", () => {
  it("validates the shipped file: 334 rows, 137 core, 127 warmup, 70 skip", () => {
    expect(rows).toHaveLength(334);
    const t = { core: 0, warmup: 0, skip: 0 };
    for (const r of rows) t[r.tier]++;
    expect(t).toEqual({ core: 137, warmup: 127, skip: 70 });
  });

  it("a LeetCode problem with the same slug is a different problem and stays untouched", async () => {
    const [lc] = await db
      .insert(problems)
      .values({
        slug: "lru-cache",
        title: "LRU Cache (LeetCode)",
        source: "leetcode",
        leetcodeNumber: 146,
        status: "active",
      })
      .returning();
    const s = await seedGfg(db, rows, { dryRun: true, batch });
    expect(s.alreadyPresent).toBe(0);
    expect(s.insertedBacklog + s.insertedArchived).toBe(334);
    const after = (await db.select().from(problems).where(eq(problems.id, lc.id)))[0];
    expect(after.title).toBe("LRU Cache (LeetCode)");
    expect(after.priorSolvedAt).toBeNull();
    await db.delete(problems).where(eq(problems.id, lc.id));
  });

  it("dry run reports every insert and writes nothing", async () => {
    const s = await seedGfg(db, rows, { dryRun: true, batch });
    expect(s.insertedBacklog).toBe(264);
    expect(s.insertedArchived).toBe(70);
    expect(s.alreadyPresent).toBe(0);
    expect(s.warnings).toEqual([]);
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(problems);
    expect(n).toBe(0);
  });

  it("real run inserts 264 backlog + 70 archived, tags everything, links relations, creates no memory state", async () => {
    const s = await seedGfg(db, rows, { dryRun: false, batch });
    expect(s.insertedBacklog).toBe(264);
    expect(s.insertedArchived).toBe(70);
    expect(s.tagsCreated.length).toBeGreaterThan(0);
    const all = await db.select().from(problems).where(eq(problems.importBatch, batch));
    expect(all).toHaveLength(334);
    expect(all.filter((p) => p.status === "backlog")).toHaveLength(264);
    expect(all.filter((p) => p.status === "archived")).toHaveLength(70);
    expect(all.every((p) => p.source === "gfg" && p.priorSolvedAt && p.tier)).toBe(true);
    const [{ tagged }] = await db
      .select({ tagged: sql<number>`count(distinct ${problemTags.problemId})::int` })
      .from(problemTags);
    expect(tagged).toBe(334);
    expect((await db.select().from(cards)).length).toBe(0);
    expect((await db.select().from(reviewLogs)).length).toBe(0);
    // Both directions for the Activity Selection pair.
    const a = all.find((p) => p.slug === "activity-selection-1587115620")!;
    const b = all.find((p) => p.slug === "n-meetings-in-one-room-1587115620")!;
    const rel = await db
      .select()
      .from(problemRelations)
      .where(eq(problemRelations.problemId, a.id));
    expect(rel.some((r) => r.relatedProblemId === b.id)).toBe(true);
    const relBack = await db
      .select()
      .from(problemRelations)
      .where(eq(problemRelations.problemId, b.id));
    expect(relBack.some((r) => r.relatedProblemId === a.id)).toBe(true);
    // Existing topic tags were reused, not duplicated.
    const graphs = await db
      .select()
      .from(tags)
      .where(sql`lower(${tags.name}) = 'graphs'`);
    expect(graphs).toHaveLength(1);
    expect(graphs[0].kind).toBe("topic");
  });

  it("re-running is a no-op and never overwrites an edited title, tier or status", async () => {
    const target = (
      await db.select().from(problems).where(eq(problems.slug, "rotten-oranges2536"))
    )[0];
    await db
      .update(problems)
      .set({ title: "Rotten Oranges (my title)", tier: "warmup", status: "active" })
      .where(eq(problems.id, target.id));
    const s = await seedGfg(db, rows, { dryRun: false, batch });
    expect(s.insertedBacklog + s.insertedArchived).toBe(0);
    expect(s.alreadyPresent).toBe(334);
    expect(s.relationsCreated).toBe(0);
    expect(s.tagsCreated).toEqual([]);
    const after = (await db.select().from(problems).where(eq(problems.id, target.id)))[0];
    expect(after.title).toBe("Rotten Oranges (my title)");
    expect(after.tier).toBe("warmup");
    expect(after.status).toBe("active");
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(problems);
    expect(n).toBe(334);
  });

  it("a deleted row comes back on the next run; skip rows stay out of the backlog", async () => {
    const victim = (
      await db.select().from(problems).where(eq(problems.slug, "topological-sort"))
    )[0];
    await db.delete(problems).where(eq(problems.id, victim.id));
    const s = await seedGfg(db, rows, { dryRun: false, batch });
    expect(s.insertedBacklog).toBe(1);
    const backlog = await db.select().from(problems).where(eq(problems.status, "backlog"));
    expect(backlog.every((p) => p.tier !== "skip")).toBe(true);
  });
});
