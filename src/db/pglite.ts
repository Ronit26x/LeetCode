import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

/**
 * In-process Postgres for tests and offline local development. Loaded only through a dynamic
 * import from db/index.ts, and never on Vercel.
 */
export async function createPgliteDb(target: string) {
  const client =
    target && target !== "memory"
      ? new PGlite(path.resolve(/* turbopackIgnore: true */ process.cwd(), target))
      : new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(/* turbopackIgnore: true */ process.cwd(), "drizzle") });
  return db;
}
