import { describe, expect, it } from "vitest";
import { interleave, primaryTagOf } from "@/lib/queue/interleave";

describe("interleave", () => {
  it("keeps earlier due days first and alternates tags within a day", () => {
    const items = [
      { id: "a1", dueDay: "2026-09-02", primaryTag: "Arrays" },
      { id: "a2", dueDay: "2026-09-02", primaryTag: "Arrays" },
      { id: "a3", dueDay: "2026-09-02", primaryTag: "Arrays" },
      { id: "g1", dueDay: "2026-09-02", primaryTag: "Graphs" },
      { id: "g2", dueDay: "2026-09-02", primaryTag: "Graphs" },
      { id: "old", dueDay: "2026-08-30", primaryTag: "Arrays" },
      { id: "dp", dueDay: "2026-09-02", primaryTag: "DP" },
    ];
    const out = interleave(items, "2026-09-02");
    expect(out[0].id).toBe("old");
    let sameTagPairs = 0;
    for (let i = 1; i < out.length; i++) if (out[i].primaryTag === out[i - 1].primaryTag) sameTagPairs++;
    // 4 Arrays, 2 Graphs, 1 DP across 7 slots: at most one forced repeat at the tail.
    expect(sameTagPairs).toBeLessThanOrEqual(1);
    expect(out.map((o) => o.id).sort()).toEqual(items.map((i) => i.id).sort());
  });

  it("is deterministic for a date and shuffles ties on another date", () => {
    const items = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, dueDay: "2026-09-02", primaryTag: i % 2 ? "A" : "B" }));
    const a = interleave(items, "2026-09-02").map((i) => i.id);
    const b = interleave(items, "2026-09-02").map((i) => i.id);
    const c = interleave(items, "2026-09-03").map((i) => i.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("puts problems without a topic tag in their own bucket", () => {
    expect(primaryTagOf([])).toBeNull();
    expect(primaryTagOf([{ kind: "custom", name: "Google", sortOrder: 0 }])).toBeNull();
    expect(primaryTagOf([{ kind: "topic", name: "Trees", sortOrder: 7 }, { kind: "topic", name: "Stack", sortOrder: 3 }])).toBe("Stack");
  });
});
