import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const PGLITE_PREFIX = "pglite://";

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  if (url.startsWith(PGLITE_PREFIX)) {
    // In-process Postgres for tests and offline local development. Never in production.
    if (process.env.NODE_ENV === "production") {
      throw new Error("A pglite:// DATABASE_URL is not allowed in production");
    }
    const target = url.slice(PGLITE_PREFIX.length);
    const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
      import("@electric-sql/pglite"),
      import("drizzle-orm/pglite"),
      import("drizzle-orm/pglite/migrator"),
    ]);
    const client = target && target !== "memory" ? new PGlite(path.resolve(process.cwd(), target)) : new PGlite();
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    return db;
  }

  // Supabase through the Supavisor transaction pooler: prepared statements must be off.
  const client = postgres(url, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzlePostgres(client, { schema });
}

const globalForDb = globalThis as unknown as { __recurDb?: Promise<Db> };

export const db: Db = await (globalForDb.__recurDb ??= createDb());

export { schema };
