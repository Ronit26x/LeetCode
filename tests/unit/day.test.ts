import { describe, expect, it } from "vitest";
import { dayEnd, dayStart, reviewDayKey, reviewDaysUntil } from "@/lib/day";

const TZ = "America/Los_Angeles";
const H = 9;
const iso = (d: Date) => d.toISOString();

describe("review day boundary at 9 AM Pacific", () => {
  it("8:59 AM belongs to yesterday's review day, 9:01 AM to today's", () => {
    // 2026-09-02 08:59 PDT = 15:59Z
    const before = new Date("2026-09-02T15:59:00Z");
    expect(iso(dayStart(before, TZ, H))).toBe("2026-09-01T16:00:00.000Z");
    expect(iso(dayEnd(before, TZ, H))).toBe("2026-09-02T16:00:00.000Z");
    expect(reviewDayKey(before, TZ, H)).toBe("2026-09-01");

    const after = new Date("2026-09-02T16:01:00Z");
    expect(iso(dayStart(after, TZ, H))).toBe("2026-09-02T16:00:00.000Z");
    expect(iso(dayEnd(after, TZ, H))).toBe("2026-09-03T16:00:00.000Z");
    expect(reviewDayKey(after, TZ, H)).toBe("2026-09-02");
  });

  it("exactly 9:00 AM starts the new day", () => {
    const at = new Date("2026-09-02T16:00:00Z");
    expect(iso(dayStart(at, TZ, H))).toBe("2026-09-02T16:00:00.000Z");
  });

  it("a card due at 11 PM is still inside that day's queue window", () => {
    const now = new Date("2026-09-03T05:00:00Z"); // Sep 2, 10 PM PDT
    const due = new Date("2026-09-03T06:00:00Z"); // Sep 2, 11 PM PDT
    expect(reviewDayKey(now, TZ, H)).toBe("2026-09-02");
    expect(due.getTime()).toBeLessThan(dayEnd(now, TZ, H).getTime());
    // and it is not yet "tomorrow" from the queue's point of view
    expect(reviewDaysUntil(now, due, TZ, H)).toBe(0);
  });

  it("handles the DST fallback on Nov 1, 2026 (a 25-hour review day)", () => {
    // Oct 31 9:00 PDT = 16:00Z; Nov 1 9:00 PST = 17:00Z.
    const now = new Date("2026-11-01T16:30:00Z"); // Nov 1, 8:30 AM PST: still Oct 31's review day
    expect(iso(dayStart(now, TZ, H))).toBe("2026-10-31T16:00:00.000Z");
    expect(iso(dayEnd(now, TZ, H))).toBe("2026-11-01T17:00:00.000Z");
    expect(reviewDayKey(now, TZ, H)).toBe("2026-10-31");

    const later = new Date("2026-11-01T17:00:00Z"); // Nov 1, 9:00 AM PST
    expect(iso(dayStart(later, TZ, H))).toBe("2026-11-01T17:00:00.000Z");
    expect(iso(dayEnd(later, TZ, H))).toBe("2026-11-02T17:00:00.000Z");
    expect(reviewDayKey(later, TZ, H)).toBe("2026-11-01");
  });

  it("handles the DST spring forward on Mar 8, 2026 (a 23-hour review day)", () => {
    // Mar 7 9:00 PST = 17:00Z; Mar 8 9:00 PDT = 16:00Z.
    const now = new Date("2026-03-08T15:30:00Z"); // Mar 8, 8:30 AM PDT
    expect(iso(dayStart(now, TZ, H))).toBe("2026-03-07T17:00:00.000Z");
    expect(iso(dayEnd(now, TZ, H))).toBe("2026-03-08T16:00:00.000Z");
  });

  it("counts review days across the DST change without drifting", () => {
    const a = new Date("2026-10-30T20:00:00Z"); // Oct 30 review day
    const b = new Date("2026-11-03T20:00:00Z"); // Nov 3 review day
    expect(reviewDaysUntil(a, b, TZ, H)).toBe(4);
    expect(reviewDaysUntil(b, a, TZ, H)).toBe(-4);
  });
});
