import { beforeAll, describe, expect, it } from "vitest";
import { freshDb } from "../helpers/db";
import type { Db } from "@/db";
import { applyRoadmapMark, listRoadmapMarks } from "@/lib/roadmap/core";
import { passesFilters, EMPTY_FILTERS } from "@/lib/roadmap/filters";
import { ROADMAP_PROBLEMS, problemsOf } from "@/lib/roadmap/data";
import { completePatterns, type RoadmapMarks } from "@/lib/roadmap/marks";

let db: Db;

beforeAll(async () => {
  db = await freshDb();
});

describe("roadmap marks", () => {
  it("stamps the done day once, clears it on redo, and removes the row on null", async () => {
    expect(await applyRoadmapMark(db, 53, "done", "2026-10-12")).toEqual({
      status: "done",
      doneOn: "2026-10-12",
    });
    // Already done: a second done write (another device) keeps the first day.
    expect(await applyRoadmapMark(db, 53, "done", "2026-10-14")).toEqual({
      status: "done",
      doneOn: "2026-10-12",
    });
    expect(await applyRoadmapMark(db, 53, "redo", "2026-10-15")).toEqual({
      status: "redo",
      doneOn: null,
    });
    // Done again after a redo is a fresh stamp.
    expect(await applyRoadmapMark(db, 53, "done", "2026-10-16")).toEqual({
      status: "done",
      doneOn: "2026-10-16",
    });
    await applyRoadmapMark(db, 198, "redo", "2026-10-16");
    expect(await listRoadmapMarks(db)).toEqual({
      53: { status: "done", doneOn: "2026-10-16" },
      198: { status: "redo", doneOn: null },
    });
    expect(await applyRoadmapMark(db, 53, null, "2026-10-17")).toBeNull();
    expect(Object.keys(await listRoadmapMarks(db))).toEqual(["198"]);
  });
});

describe("roadmap filters", () => {
  const maxSub = ROADMAP_PROBLEMS.find((p) => p.number === 53)!;
  it("matches on every axis", () => {
    expect(passesFilters(maxSub, EMPTY_FILTERS, undefined)).toBe(true);
    expect(passesFilters(maxSub, { ...EMPTY_FILTERS, week: 2 }, undefined)).toBe(false);
    expect(passesFilters(maxSub, { ...EMPTY_FILTERS, hardOnly: true }, undefined)).toBe(false);
    expect(passesFilters(maxSub, { ...EMPTY_FILTERS, p1Only: true }, undefined)).toBe(true);
    expect(passesFilters(maxSub, { ...EMPTY_FILTERS, freshOnly: true }, undefined)).toBe(false);
    expect(passesFilters(maxSub, { ...EMPTY_FILTERS, starredOnly: true }, undefined)).toBe(true);
    expect(passesFilters(maxSub, { ...EMPTY_FILTERS, tier: "plus" }, undefined)).toBe(false);
    expect(passesFilters(maxSub, { ...EMPTY_FILTERS, status: "todo" }, undefined)).toBe(true);
    expect(
      passesFilters(maxSub, { ...EMPTY_FILTERS, status: "done" }, { status: "done", doneOn: null }),
    ).toBe(true);
    expect(passesFilters(maxSub, { ...EMPTY_FILTERS, q: "53" }, undefined)).toBe(true);
    expect(passesFilters(maxSub, { ...EMPTY_FILTERS, q: "maximum sub" }, undefined)).toBe(true);
    expect(passesFilters(maxSub, { ...EMPTY_FILTERS, q: "house" }, undefined)).toBe(false);
    expect(passesFilters(maxSub, { ...EMPTY_FILTERS, pattern: "D2" }, undefined)).toBe(false);
  });
});

describe("complete patterns", () => {
  it("lists a pattern only once every one of its problems is done", () => {
    const marks: RoadmapMarks = {};
    for (const p of problemsOf("BT")) marks[p.number] = { status: "done", doneOn: "2026-10-20" };
    const d1 = problemsOf("D1");
    for (const p of d1.slice(1)) marks[p.number] = { status: "done", doneOn: "2026-10-20" };
    marks[d1[0].number] = { status: "redo", doneOn: null };
    expect([...completePatterns(marks)]).toEqual(["BT"]);
    marks[d1[0].number] = { status: "done", doneOn: "2026-10-21" };
    expect([...completePatterns(marks)].sort()).toEqual(["BT", "D1"]);
    expect(completePatterns({}).size).toBe(0);
  });
});
