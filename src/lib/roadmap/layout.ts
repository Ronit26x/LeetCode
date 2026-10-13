import {
  ROADMAP_EDGES,
  ROADMAP_LAYERS,
  ROADMAP_WEEKS,
  type PatternCode,
  type WeekNumber,
} from "./data";

export interface RoadmapLayoutOptions {
  width: number;
  nodeWidth: number;
  nodeHeight: number;
  /** Horizontal gap between nodes in a layer. */
  gap: number;
  /** Vertical distance between the tops of consecutive layers. */
  layerGap: number;
  /** Space above a week's first layer for its title row. */
  headerHeight: number;
  bandPadBottom: number;
  /** Vertical gap between week bands; hand-off edges cross it. */
  bandGap: number;
  /** Horizontal margin inside the drawing. */
  margin: number;
}

export interface NodePosition {
  /** Center x. */
  x: number;
  /** Top y. */
  y: number;
  week: WeekNumber;
  layer: number;
}

export interface BandBox {
  week: WeekNumber;
  top: number;
  height: number;
}

export interface RoadmapLayout {
  width: number;
  height: number;
  nodes: Record<PatternCode, NodePosition>;
  bands: BandBox[];
}

/**
 * Layered layout of the whole roadmap. Each node sits under the mean of its prerequisites (or is
 * spread evenly when it has none), then the layer is spaced out, re-centered and clamped to the
 * margins. Hand-offs do not pull nodes, so every week's graph stays centered in its band and the
 * dashed edges simply connect wherever the two weeks end up.
 */
export function layoutRoadmap(o: RoadmapLayoutOptions): RoadmapLayout {
  const parents = new Map<PatternCode, PatternCode[]>();
  for (const [a, b] of ROADMAP_EDGES) {
    const list = parents.get(b) ?? [];
    list.push(a);
    parents.set(b, list);
  }
  const x = new Map<PatternCode, number>();
  const step = o.nodeWidth + o.gap;
  const leftBound = o.margin + o.nodeWidth / 2;
  const rightBound = o.width - o.margin - o.nodeWidth / 2;

  for (const layer of ROADMAP_LAYERS) {
    const codes = layer.codes;
    const even = (i: number) => ((i + 0.5) / codes.length) * o.width;
    const row = codes.map((c, i) => {
      const ps = (parents.get(c) ?? []).filter((p) => x.has(p));
      const desired = ps.length ? ps.reduce((s, p) => s + (x.get(p) ?? 0), 0) / ps.length : even(i);
      return { c, i, desired };
    });
    row.sort((a, b) => a.desired - b.desired || a.i - b.i);
    const pos = row.map((r) => r.desired);
    for (let i = 1; i < pos.length; i++) pos[i] = Math.max(pos[i], pos[i - 1] + step);
    const mean = (v: number[]) => v.reduce((s, n) => s + n, 0) / v.length;
    const shift = mean(row.map((r) => r.desired)) - mean(pos);
    for (let i = 0; i < pos.length; i++) pos[i] += shift;
    if (pos[pos.length - 1] > rightBound) {
      pos[pos.length - 1] = rightBound;
      for (let i = pos.length - 2; i >= 0; i--) pos[i] = Math.min(pos[i], pos[i + 1] - step);
    }
    if (pos[0] < leftBound) {
      pos[0] = leftBound;
      for (let i = 1; i < pos.length; i++) pos[i] = Math.max(pos[i], pos[i - 1] + step);
    }
    row.forEach((r, i) => x.set(r.c, pos[i]));
  }

  const nodes = {} as Record<PatternCode, NodePosition>;
  const bands: BandBox[] = [];
  let y = 1;
  for (const week of ROADMAP_WEEKS) {
    const layers = ROADMAP_LAYERS.map((l, index) => ({ ...l, index })).filter(
      (l) => l.week === week.n,
    );
    const top = y;
    const height =
      o.headerHeight + (layers.length - 1) * o.layerGap + o.nodeHeight + o.bandPadBottom;
    layers.forEach((l, li) => {
      for (const c of l.codes) {
        nodes[c] = {
          x: x.get(c) ?? o.width / 2,
          y: top + o.headerHeight + li * o.layerGap,
          week: week.n,
          layer: l.index,
        };
      }
    });
    bands.push({ week: week.n, top, height });
    y = top + height + o.bandGap;
  }
  return { width: o.width, height: y - o.bandGap + 1, nodes, bands };
}

/** A vertical S-curve from the bottom center of `a` to the top center of `b`. */
export function edgePath(a: NodePosition, b: NodePosition, nodeHeight: number): string {
  const y1 = a.y + nodeHeight;
  const y2 = b.y;
  const mid = (y1 + y2) / 2;
  return `M${a.x},${y1} C${a.x},${mid} ${b.x},${mid} ${b.x},${y2}`;
}
