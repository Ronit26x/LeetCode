import { describe, expect, it } from "vitest";
import { effectiveRetention } from "@/lib/fsrs/core";

const base = {
  desiredRetention: 0.9,
  retentionRampEnabled: true,
  retentionRampDays: 14,
  retentionRampTarget: 0.95,
};

describe("effectiveRetention", () => {
  it("is the base value outside the ramp window", () => {
    expect(effectiveRetention(base, 30)).toBe(0.9);
    expect(effectiveRetention(base, 14)).toBe(0.9);
  });
  it("ramps linearly to the target on interview day", () => {
    expect(effectiveRetention(base, 7)).toBeCloseTo(0.925, 6);
    expect(effectiveRetention(base, 0)).toBeCloseTo(0.95, 6);
  });
  it("switches off after the interview and when disabled or unset", () => {
    expect(effectiveRetention(base, -1)).toBe(0.9);
    expect(effectiveRetention({ ...base, retentionRampEnabled: false }, 3)).toBe(0.9);
    expect(effectiveRetention(base, null)).toBe(0.9);
  });
  it("clamps to the sane range", () => {
    expect(effectiveRetention({ ...base, desiredRetention: 0.5 }, null)).toBe(0.8);
    expect(effectiveRetention({ ...base, retentionRampTarget: 0.999 }, 0)).toBe(0.97);
  });
});
