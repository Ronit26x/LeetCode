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
    if (process.env.VERCEL) throw new Error("A pglite:// DATABASE_URL is not allowed on Vercel");
    const { createPgliteDb } = await import("./pglite");
    return createPgliteDb(url.slice(PGLITE_PREFIX.length));
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

/** Lazily created and cached across hot reloads. Nothing connects at import time. */
export function getDb(): Promise<Db> {
  globalForDb.__recurDb ??= createDb().catch((e) => {
    globalForDb.__recurDb = undefined;
    throw e;
  });
  return globalForDb.__recurDb;
}

export { schema };
