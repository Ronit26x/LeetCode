// Boots an in-memory PGlite database with the real migrations. Import this before "@/db".
process.env.DATABASE_URL = "pglite://memory";

export async function freshDb() {
  const mod = await import("@/db");
  return mod.getDb();
}
