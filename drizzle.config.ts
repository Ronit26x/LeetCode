import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// Migrations run over the session pooler (DIRECT_URL, port 5432). The app itself uses DATABASE_URL.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";
const pglite = url.startsWith("pglite://");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
  ...(pglite
    ? { driver: "pglite" as const, dbCredentials: { url: url.slice("pglite://".length) || "memory" } }
    : { dbCredentials: { url } }),
});
