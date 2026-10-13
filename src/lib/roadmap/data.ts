/**
 * The Google R2 pattern list: 413 LeetCode problems grouped by the pattern to recognize and
 * mapped to a four-week plan before the interview. Static, curated data; the only state the app
 * stores is the Done / Redo mark per problem (`roadmap_marks`). Nothing here touches cards, logs
 * or FSRS: the roadmap and the reviser live side by side and stay independent.
 *
 * Built from the pattern-list artifact on 2026-10-12. Edit by hand after that.
 */
import problemsJson from "../../../data/roadmap/problems.json";

export const PATTERN_CODES = [
  "D1",
  "D2",
  "DS",
  "DK",
  "DI",
  "DB",
  "DL",
  "BT",
  "GR",
  "GB",
  "BFSS",
  "TS",
  "UF",
  "SP",
  "TRI",
  "TR",
  "BST",
  "TD",
  "DE",
  "SW",
  "PS",
  "TP",
  "ST",
  "MS",
  "BS",
  "BA",
  "HP",
  "IV",
  "AH",
  "LL",
  "RQ",
  "SA",
  "MB",
  "SIM",
] as const;
export type PatternCode = (typeof PATTERN_CODES)[number];

export type WeekNumber = 1 | 2 | 3 | 4;
export type RoadmapDifficulty = "easy" | "medium" | "hard";
/** P1: asked in the last 30 days or frequency 45+. P2: last 3 months. P3: last 6 months. NC: not Google-tagged, starred on NeetCode. GAP: added to cover a technique the Google lists miss. */
export type RoadmapPriority = "P1" | "P2" | "P3" | "NC" | "GAP";
/** core: the 10-a-day plan. plus: the next 32 P2 hards. stretch: everything else. */
export type RoadmapTier = "core" | "plus" | "stretch";
export type RoadmapWindow = "30 days" | "3 months" | "6 months";

export interface RoadmapPattern {
  name: string;
  /** Fits inside a roadmap node. */
  short: string;
  week: WeekNumber;
  /** How to recognize the pattern from the prompt. */
  trigger: string;
}

export interface RoadmapProblem {
  number: number;
  title: string;
  slug: string;
  difficulty: RoadmapDifficulty;
  pattern: PatternCode;
  priority: RoadmapPriority;
  tier: RoadmapTier;
  /** LeetCode's relative frequency score for Google. */
  frequency: number;
  /** The most recent Google-tagged window the problem appears in. */
  window: RoadmapWindow | null;
  /** Accepted on LeetCode before the plan started: do it as a cold re-solve. */
  solvedBefore: boolean;
  /** Starred on NeetCode, under this NeetCode category. */
  neetcodeCategory: string | null;
  /** Named, or closely matched, in a 2026 Google interview report on LeetCode Discuss. */
  reported2026: boolean;
}

export interface RoadmapWeek {
  n: WeekNumber;
  /** Inclusive calendar dates, YYYY-MM-DD. */
  start: string;
  end: string;
  dates: string;
  focus: string;
}

/** Practice runs start to end, then a taper, then the interview. Dates are calendar days. */
export const ROADMAP_PLAN = {
  start: "2026-10-12",
  end: "2026-11-03",
  totalDays: 23,
  taperStart: "2026-11-04",
  taperEnd: "2026-11-11",
  interview: "2026-11-12",
  endLabel: "Nov 3",
  taperLabel: "Nov 4 to 11",
  interviewLabel: "Thu Nov 12",
} as const;

export const ROADMAP_WEEKS: RoadmapWeek[] = [
  {
    n: 1,
    start: "2026-10-12",
    end: "2026-10-17",
    dates: "Oct 12–17",
    focus: "DP, backtracking, greedy",
  },
  {
    n: 2,
    start: "2026-10-18",
    end: "2026-10-24",
    dates: "Oct 18–24",
    focus: "Graphs, trees, trie, design",
  },
  {
    n: 3,
    start: "2026-10-25",
    end: "2026-10-31",
    dates: "Oct 25–31",
    focus: "Arrays, windows, stacks, search, heaps, intervals, lists",
  },
  {
    n: 4,
    start: "2026-11-01",
    end: "2026-11-03",
    dates: "Nov 1–3",
    focus: "Math, simulation, range queries, string algorithms",
  },
];

export const PATTERNS: Record<PatternCode, RoadmapPattern> = {
  D1: {
    name: "DP: 1D / Linear",
    short: "1-D DP",
    week: 1,
    trigger: "best answer ending at i, choose/skip, stock state machines, jumps, decode counts.",
  },
  D2: {
    name: "DP: Grid",
    short: "Grid DP",
    week: 1,
    trigger:
      "paths through a grid with min/max/count, two walkers at once (cherry pickup), squares/rectangles.",
  },
  DS: {
    name: "DP: Strings & Subsequences",
    short: "String DP",
    week: 1,
    trigger:
      "two strings compared (edit, LCS, interleave, regex), palindromic substrings/subsequences, distinct subsequence counts.",
  },
  DK: {
    name: "DP: Knapsack",
    short: "Knapsack DP",
    week: 1,
    trigger: "pick items to hit a target sum/capacity; 0/1 vs unbounded; count ways vs min coins.",
  },
  DI: {
    name: "DP: Interval & Game",
    short: "Interval & Game DP",
    week: 1,
    trigger:
      "answer for a range [l,r] built from splits (burst, merge, cut), two players taking from ends or prefixes.",
  },
  DB: {
    name: "DP: Bitmask & Digit",
    short: "Bitmask & Digit DP",
    week: 1,
    trigger:
      "n ≤ 20 with subsets/permutations, or counting numbers in a range with digit constraints.",
  },
  DL: {
    name: "DP: LIS & DP + Binary Search",
    short: "LIS & DP + BS",
    week: 1,
    trigger:
      "increasing subsequences, envelopes, weighted job scheduling (sort + binary search previous).",
  },
  BT: {
    name: "Backtracking",
    short: "Backtracking",
    week: 1,
    trigger:
      "generate all combinations/permutations/partitions, place pieces under constraints, prune hard.",
  },
  GR: {
    name: "Greedy",
    short: "Greedy",
    week: 1,
    trigger:
      "local best choice provably safe: jumps, gas stations, partitioning, exchange-argument sorting.",
  },
  GB: {
    name: "Graph BFS/DFS & Grids",
    short: "Graphs BFS/DFS",
    week: 2,
    trigger:
      "islands, regions, 'can you reach', clone/copy a graph, word transformations. Count components or flood-fill.",
  },
  BFSS: {
    name: "BFS with State / Multi-source / 0-1",
    short: "BFS with State",
    week: 2,
    trigger:
      "'minimum steps' where the state is more than a cell (keys, obstacles left, mask), many start points at once, or edges costing 0 or 1.",
  },
  TS: {
    name: "Topological Sort",
    short: "Topological Sort",
    week: 2,
    trigger:
      "dependencies, prerequisites, build order, 'is there a valid ordering', longest path in a DAG.",
  },
  UF: {
    name: "Union-Find",
    short: "Union-Find",
    week: 2,
    trigger:
      "connectivity that grows as edges arrive, grouping/merging, offline queries sorted by threshold, 'earliest time everyone is connected'.",
  },
  SP: {
    name: "Shortest Path & MST",
    short: "Shortest Path & MST",
    week: 2,
    trigger:
      "weighted edges, minimum cost/time, 'at most k stops', minimax path (minimize the max edge), connect all points cheaply.",
  },
  TRI: {
    name: "Trie",
    short: "Trie",
    week: 2,
    trigger: "prefixes, autocomplete, many words searched together on a board, max XOR of pairs.",
  },
  TR: {
    name: "Trees: Traversal & Construction",
    short: "Trees",
    week: 2,
    trigger:
      "level-by-level output, views, serialize, build from traversals, distance-k from a node.",
  },
  BST: {
    name: "Binary Search Trees",
    short: "BST",
    week: 2,
    trigger: "sorted-order property, kth smallest, validate, LCA using value ordering.",
  },
  TD: {
    name: "Tree DP, LCA & Paths",
    short: "Tree DP & LCA",
    week: 2,
    trigger:
      "answer combines results from children (max path, cameras, rob), LCA, root-to-node paths, rerooting, binary lifting.",
  },
  DE: {
    name: "Design",
    short: "Design",
    week: 2,
    trigger:
      "'implement a class': caches, iterators, rate limiters, versioned KV stores, file systems.",
  },
  SW: {
    name: "Sliding Window",
    short: "Sliding Window",
    week: 3,
    trigger:
      "contiguous subarray/substring with a constraint; 'longest/shortest/count windows'; exactly K = atMost(K) − atMost(K−1).",
  },
  PS: {
    name: "Prefix Sum & Difference Array",
    short: "Prefix Sum",
    week: 3,
    trigger:
      "subarray sum equals/divisible by k, range updates, balance counts (0/1 as −1/+1), random pick by weight.",
  },
  TP: {
    name: "Two Pointers",
    short: "Two Pointers",
    week: 3,
    trigger:
      "sorted array pair/triplet sums, in-place partitioning, comparing from both ends, next permutation.",
  },
  ST: {
    name: "Stack & Parsing",
    short: "Stack & Parsing",
    week: 3,
    trigger:
      "nested brackets, expression evaluation, decode/flatten nested strings, undo-like operations.",
  },
  MS: {
    name: "Monotonic Stack / Deque",
    short: "Monotonic Stack",
    week: 3,
    trigger:
      "next greater/smaller, spans, 'visible' elements, histogram areas, sliding-window max/min, lexicographically smallest removal.",
  },
  BS: {
    name: "Binary Search (Classic)",
    short: "Binary Search",
    week: 3,
    trigger:
      "sorted or rotated input, peak finding, first/last position, searching a sorted matrix.",
  },
  BA: {
    name: "Binary Search on the Answer",
    short: "BS on the Answer",
    week: 3,
    trigger:
      "'minimize the maximum', 'smallest X such that', capacity/speed/days; feasibility check is monotonic.",
  },
  HP: {
    name: "Heap / Top-K / Scheduling",
    short: "Heap / Top-K",
    week: 3,
    trigger:
      "k largest/closest, merge k sorted, streaming median, CPU/room scheduling, greedy picking of the best available.",
  },
  IV: {
    name: "Intervals & Sweep Line",
    short: "Intervals",
    week: 3,
    trigger:
      "meetings, ranges, overlaps, free time, min rooms, events with start/end, queries over intervals.",
  },
  AH: {
    name: "Arrays & Hashing",
    short: "Arrays & Hashing",
    week: 3,
    trigger: "grouping by a key, counting, O(n) membership, in-place index marking.",
  },
  LL: {
    name: "Linked List & Cycle Detection",
    short: "Linked List",
    week: 3,
    trigger:
      "reverse in groups, reorder, merge/sort lists, pointer surgery; Floyd's cycle detection, including arrays where values act as next-pointers.",
  },
  RQ: {
    name: "Segment Tree / BIT / Ordered Set",
    short: "Segment Tree / BIT",
    week: 4,
    trigger:
      "range queries with updates, 'count smaller after self', inversion-style counts, dynamic intervals.",
  },
  SA: {
    name: "String Algorithms (KMP / Hashing)",
    short: "String Algorithms",
    week: 4,
    trigger: "longest prefix that is also a suffix, shortest palindrome, repeated substrings.",
  },
  MB: {
    name: "Math & Bit Manipulation",
    short: "Math & Bits",
    week: 4,
    trigger: "overflow-safe arithmetic, primes, gcd, counting by digits, XOR tricks, geometry.",
  },
  SIM: {
    name: "Simulation & Matrix",
    short: "Simulation & Matrix",
    week: 4,
    trigger:
      "follow the rules carefully: spiral, rotate, zigzag, text formatting, parsing numbers.",
  },
};

/**
 * One roadmap. Layers run top to bottom and each layer belongs to a week, so the weeks are
 * horizontal partitions of a single graph. `edges` are prerequisites inside a week; `handoffs`
 * connect the last layer of a week to the first layer of the next, so every topic is reachable
 * from the first one.
 */
export interface RoadmapLayer {
  week: WeekNumber;
  codes: PatternCode[];
}

export const ROADMAP_LAYERS: RoadmapLayer[] = [
  { week: 1, codes: ["BT"] },
  { week: 1, codes: ["D1"] },
  { week: 1, codes: ["D2", "DS", "DK", "GR"] },
  { week: 1, codes: ["DI", "DL", "DB"] },
  { week: 2, codes: ["TR", "DE"] },
  { week: 2, codes: ["BST", "TD", "TRI", "GB"] },
  { week: 2, codes: ["BFSS", "TS", "UF"] },
  { week: 2, codes: ["SP"] },
  { week: 3, codes: ["AH"] },
  { week: 3, codes: ["ST", "TP", "PS", "HP"] },
  { week: 3, codes: ["MS", "BS", "LL", "SW", "IV"] },
  { week: 3, codes: ["BA"] },
  { week: 4, codes: ["SIM", "MB"] },
  { week: 4, codes: ["RQ", "SA"] },
];

export const ROADMAP_EDGES: [PatternCode, PatternCode][] = [
  ["BT", "D1"],
  ["D1", "D2"],
  ["D1", "DS"],
  ["D1", "DK"],
  ["D1", "GR"],
  ["D2", "DI"],
  ["DS", "DI"],
  ["DS", "DL"],
  ["DK", "DB"],
  ["TR", "BST"],
  ["TR", "TD"],
  ["TR", "TRI"],
  ["TR", "GB"],
  ["GB", "BFSS"],
  ["GB", "TS"],
  ["GB", "UF"],
  ["BFSS", "SP"],
  ["AH", "ST"],
  ["AH", "TP"],
  ["AH", "PS"],
  ["AH", "HP"],
  ["ST", "MS"],
  ["TP", "BS"],
  ["TP", "LL"],
  ["TP", "SW"],
  ["PS", "SW"],
  ["HP", "IV"],
  ["BS", "BA"],
  ["MB", "RQ"],
  ["MB", "SA"],
];

/** Week-to-week hand-offs: finish the sources, start the targets. */
export const ROADMAP_HANDOFFS: [PatternCode, PatternCode][] = [
  ["DI", "TR"],
  ["DL", "TR"],
  ["DB", "DE"],
  ["SP", "AH"],
  ["BA", "SIM"],
  ["BA", "MB"],
];

export const ROADMAP_PROBLEMS = problemsJson as RoadmapProblem[];

const BY_PATTERN = new Map<PatternCode, RoadmapProblem[]>();
for (const code of PATTERN_CODES) BY_PATTERN.set(code, []);
for (const p of ROADMAP_PROBLEMS) BY_PATTERN.get(p.pattern)?.push(p);

/** Problems of one pattern, in list order. */
export function problemsOf(code: PatternCode): RoadmapProblem[] {
  return BY_PATTERN.get(code) ?? [];
}

export const ROADMAP_NUMBERS: ReadonlySet<number> = new Set(ROADMAP_PROBLEMS.map((p) => p.number));

export function weekOf(n: WeekNumber): RoadmapWeek {
  return ROADMAP_WEEKS[n - 1];
}

export function leetcodeUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}
