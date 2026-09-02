// Prints "slug id" for every problem in the local database. Dev helper for screenshots.
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const { getDb } = await import("@/db");
const db = await getDb();
for (const p of await db.query.problems.findMany({ columns: { id: true, slug: true } }))
  console.log(p.slug, p.id);
process.exit(0);
