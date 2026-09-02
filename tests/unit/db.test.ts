import { describe, expect, it, beforeAll } from "vitest";
import { freshDb } from "../helpers/db";
import type { Db } from "@/db";
import { problems, tags } from "@/db/schema";
import { ensureDefaults, getSettings } from "@/db/bootstrap";
import { DEFAULT_TOPIC_TAGS } from "@/db/defaults";

let db: Db;

beforeAll(async () => {
  db = await freshDb();
});

describe("database bootstrap", () => {
  it("runs migrations and seeds defaults exactly once", async () => {
    await ensureDefaults();
    await ensureDefaults();
    const rows = await db.select().from(tags);
    expect(rows).toHaveLength(DEFAULT_TOPIC_TAGS.length);
    expect(rows.every((t) => t.kind === "topic")).toBe(true);
    const s = await getSettings();
    expect(s.id).toBe(1);
    expect(s.timezone).toBe("America/Los_Angeles");
    expect(s.dayStartHour).toBe(9);
    expect(s.desiredRetention).toBe(0.9);
    expect(s.fsrsParams).toHaveLength(21);
    expect(s.interviewDate).toBe("2026-10-06");
    expect(s.resolveTimeTargetsMin).toEqual({ easy: 15, medium: 30, hard: 45 });
  });

  it("enforces unique slugs and case-insensitive tag names", async () => {
    await db.insert(problems).values({ slug: "two-sum", title: "Two Sum", leetcodeNumber: 1 });
    await expect(
      db.insert(problems).values({ slug: "two-sum", title: "Two Sum again" }),
    ).rejects.toThrow();
    await expect(db.insert(tags).values({ name: "arrays & hashing" })).rejects.toThrow();
  });
});
