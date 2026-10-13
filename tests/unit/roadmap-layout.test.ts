import { describe, expect, it } from "vitest";
import { PATTERN_CODES, ROADMAP_LAYERS } from "@/lib/roadmap/data";
import { edgePath, layoutRoadmap } from "@/lib/roadmap/layout";

const opts = {
  width: 1120,
  nodeWidth: 168,
  nodeHeight: 60,
  gap: 20,
  layerGap: 104,
  headerHeight: 68,
  bandPadBottom: 20,
  bandGap: 44,
  margin: 24,
};

describe("roadmap layout", () => {
  const layout = layoutRoadmap(opts);

  it("positions every pattern inside the margins", () => {
    for (const code of PATTERN_CODES) {
      const n = layout.nodes[code];
      expect(n.x - opts.nodeWidth / 2).toBeGreaterThanOrEqual(opts.margin - 1e-6);
      expect(n.x + opts.nodeWidth / 2).toBeLessThanOrEqual(opts.width - opts.margin + 1e-6);
    }
  });

  it("never overlaps nodes in a layer and centers single nodes", () => {
    for (const layer of ROADMAP_LAYERS) {
      const xs = layer.codes.map((c) => layout.nodes[c].x).sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++)
        expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(opts.nodeWidth + opts.gap - 1e-6);
      if (xs.length === 1 && layer.codes[0] === "BT") expect(xs[0]).toBe(opts.width / 2);
    }
  });

  it("stacks layers down the page inside their week band", () => {
    let lastY = -Infinity;
    for (const layer of ROADMAP_LAYERS) {
      const ys = new Set(layer.codes.map((c) => layout.nodes[c].y));
      expect(ys.size).toBe(1);
      const [y] = ys;
      expect(y).toBeGreaterThan(lastY);
      lastY = y;
      const band = layout.bands[layer.week - 1];
      expect(y).toBeGreaterThanOrEqual(band.top + opts.headerHeight);
      expect(y + opts.nodeHeight).toBeLessThanOrEqual(band.top + band.height);
    }
    expect(layout.bands).toHaveLength(4);
    expect(layout.height).toBeGreaterThan(layout.bands[3].top + layout.bands[3].height);
  });

  it("draws an S-curve from the bottom of one node to the top of the next", () => {
    const d = edgePath(
      { x: 100, y: 0, week: 1, layer: 0 },
      { x: 300, y: 104, week: 1, layer: 1 },
      60,
    );
    expect(d).toBe("M100,60 C100,82 300,82 300,104");
  });
});
