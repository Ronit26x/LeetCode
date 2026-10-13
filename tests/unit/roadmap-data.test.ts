import { describe, expect, it } from "vitest";
import {
  PATTERN_CODES,
  PATTERNS,
  ROADMAP_EDGES,
  ROADMAP_HANDOFFS,
  ROADMAP_LAYERS,
  ROADMAP_PROBLEMS,
  ROADMAP_WEEKS,
  problemsOf,
  type PatternCode,
} from "@/lib/roadmap/data";

const layerOf = new Map<PatternCode, number>();
ROADMAP_LAYERS.forEach((l, i) => l.codes.forEach((c) => layerOf.set(c, i)));

describe("roadmap data", () => {
  it("has 413 problems with unique numbers and slugs, each on a known pattern", () => {
    expect(ROADMAP_PROBLEMS).toHaveLength(413);
    expect(new Set(ROADMAP_PROBLEMS.map((p) => p.number)).size).toBe(413);
    expect(new Set(ROADMAP_PROBLEMS.map((p) => p.slug)).size).toBe(413);
    for (const p of ROADMAP_PROBLEMS) {
      expect(PATTERNS[p.pattern], `${p.title} pattern`).toBeDefined();
      expect(["easy", "medium", "hard"]).toContain(p.difficulty);
      expect(["P1", "P2", "P3", "NC", "GAP"]).toContain(p.priority);
      expect(["core", "plus", "stretch"]).toContain(p.tier);
      expect([null, "30 days", "3 months", "6 months"]).toContain(p.window);
    }
    for (const code of PATTERN_CODES) expect(problemsOf(code).length).toBeGreaterThan(0);
  });

  it("keeps the tier counts the plan was written against", () => {
    const by = (t: string) => ROADMAP_PROBLEMS.filter((p) => p.tier === t).length;
    expect(by("core")).toBe(218);
    expect(by("plus")).toBe(32);
    expect(by("stretch")).toBe(163);
  });

  it("places every pattern in exactly one layer of its own week, weeks in order", () => {
    const seen = new Map<PatternCode, number>();
    for (const layer of ROADMAP_LAYERS)
      for (const c of layer.codes) {
        seen.set(c, (seen.get(c) ?? 0) + 1);
        expect(PATTERNS[c].week, `${c} week`).toBe(layer.week);
      }
    for (const code of PATTERN_CODES) expect(seen.get(code), `${code} layers`).toBe(1);
    for (let i = 1; i < ROADMAP_LAYERS.length; i++)
      expect(ROADMAP_LAYERS[i].week).toBeGreaterThanOrEqual(ROADMAP_LAYERS[i - 1].week);
    expect(ROADMAP_WEEKS.map((w) => w.n)).toEqual([1, 2, 3, 4]);
  });

  it("draws prerequisite edges downward inside a week and hand-offs between adjacent weeks", () => {
    for (const [a, b] of ROADMAP_EDGES) {
      expect(PATTERNS[a].week, `${a}->${b}`).toBe(PATTERNS[b].week);
      expect(layerOf.get(a)!, `${a}->${b}`).toBeLessThan(layerOf.get(b)!);
    }
    for (const [a, b] of ROADMAP_HANDOFFS) {
      expect(PATTERNS[b].week, `${a}->${b}`).toBe(PATTERNS[a].week + 1);
      const lastOfWeek = Math.max(
        ...ROADMAP_LAYERS.map((l, i) => (l.week === PATTERNS[a].week ? i : -1)),
      );
      const firstOfNext = Math.min(
        ...ROADMAP_LAYERS.map((l, i) => (l.week === PATTERNS[b].week ? i : Infinity)),
      );
      expect(layerOf.get(a), `${a} is in the last layer of its week`).toBe(lastOfWeek);
      expect(layerOf.get(b), `${b} is in the first layer of its week`).toBe(firstOfNext);
    }
  });

  it("is one connected roadmap", () => {
    const adj = new Map<PatternCode, PatternCode[]>();
    for (const [a, b] of [...ROADMAP_EDGES, ...ROADMAP_HANDOFFS]) {
      adj.set(a, [...(adj.get(a) ?? []), b]);
      adj.set(b, [...(adj.get(b) ?? []), a]);
    }
    const seen = new Set<PatternCode>();
    const queue: PatternCode[] = [ROADMAP_LAYERS[0].codes[0]];
    while (queue.length) {
      const c = queue.shift()!;
      if (seen.has(c)) continue;
      seen.add(c);
      queue.push(...(adj.get(c) ?? []));
    }
    expect([...seen].sort()).toEqual([...PATTERN_CODES].sort());
  });
});
