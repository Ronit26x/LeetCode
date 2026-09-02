import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
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

  // Supabase through the Supavisor transaction pooler. node-postgres issues unnamed statements, so
  // no prepared-statement setting is needed; postgres.js was dropped because it hangs on this pooler
  // under concurrent queries (see DECISIONS.md). query_timeout is a client-side guard: a query that
  // gets no answer fails instead of holding a request open forever.
  const pool = new Pool({
    connectionString: url,
    max: Number(process.env.RECUR_PG_MAX ?? 5),
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    query_timeout: 30_000,
    keepAlive: true,
  });
  pool.on("error", (e) => console.error("[db] idle client error", e));
  if (process.env.RECUR_PG_DEBUG) {
    pool.on("connect", () => console.log(`[pg] connect (total ${pool.totalCount})`));
  }
  return drizzleNodePg(pool, { schema });
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
