import { eq, sql } from "drizzle-orm";
import type { Db, Tx } from "@/db";
import { roadmapMarks } from "@/db/schema";
import type { RoadmapMark, RoadmapMarkStatus, RoadmapMarks } from "./marks";

/**
 * Set, change or clear the mark on one roadmap problem. Marking done stamps today's review day
 * the first time; a row that is already done keeps its day. Redo clears it. Null removes the row.
 */
export async function applyRoadmapMark(
  db: Db | Tx,
  number: number,
  status: RoadmapMarkStatus | null,
  today: string,
  now = new Date(),
): Promise<RoadmapMark | null> {
  if (status === null) {
    await db.delete(roadmapMarks).where(eq(roadmapMarks.problemNumber, number));
    return null;
  }
  const doneOn = status === "done" ? today : null;
  const [row] = await db
    .insert(roadmapMarks)
    .values({ problemNumber: number, status, doneOn, updatedAt: now })
    .onConflictDoUpdate({
      target: roadmapMarks.problemNumber,
      set: {
        status,
        updatedAt: now,
        doneOn:
          status === "done"
            ? sql`case when ${roadmapMarks.status} = 'done' then ${roadmapMarks.doneOn} else ${sql.raw("excluded.done_on")} end`
            : null,
      },
    })
    .returning();
  return { status: row.status, doneOn: row.doneOn };
}

export async function listRoadmapMarks(db: Db | Tx): Promise<RoadmapMarks> {
  const rows = await db.select().from(roadmapMarks);
  const out: RoadmapMarks = {};
  for (const r of rows) out[r.problemNumber] = { status: r.status, doneOn: r.doneOn };
  return out;
}
