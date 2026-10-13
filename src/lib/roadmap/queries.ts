import "server-only";
import { getDb } from "@/db";
import { listRoadmapMarks } from "./core";
import type { RoadmapMarks } from "./marks";

export async function getRoadmapMarks(): Promise<RoadmapMarks> {
  const db = await getDb();
  return listRoadmapMarks(db);
}
