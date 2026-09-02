import { default_w } from "ts-fsrs";
import type { TagColor } from "./schema";

export const DEFAULT_FSRS_W: number[] = [...default_w];

export const DEFAULT_SETTINGS = {
  timezone: "America/Los_Angeles",
  dayStartHour: 9,
  desiredRetention: 0.9,
  maximumInterval: 365,
  fsrsParams: DEFAULT_FSRS_W,
  interviewDate: "2026-10-06",
  retentionRampEnabled: true,
  retentionRampDays: 14,
  retentionRampTarget: 0.95,
  cramWindowDays: 7,
  allowEasyInRevise: false,
  resolveMilestonesDays: [7, 30, 90],
  resolveAfterNRevises: 3,
  resolveTimeTargetsMin: { easy: 15, medium: 30, hard: 45 },
  reviseTimeEstimateMin: 3,
  dailySoftCap: null as number | null,
};

/** Seeded once, on first run. Renaming, recoloring, merging and deleting are all allowed after. */
export const DEFAULT_TOPIC_TAGS: { name: string; color: TagColor }[] = [
  { name: "Arrays & Hashing", color: "blue" },
  { name: "Two Pointers", color: "sky" },
  { name: "Sliding Window", color: "teal" },
  { name: "Stack", color: "amber" },
  { name: "Monotonic Stack", color: "orange" },
  { name: "Binary Search", color: "indigo" },
  { name: "Linked List", color: "lime" },
  { name: "Trees", color: "green" },
  { name: "Tries", color: "teal" },
  { name: "Heap / Priority Queue", color: "red" },
  { name: "Backtracking", color: "pink" },
  { name: "Graphs", color: "violet" },
  { name: "BFS/DFS", color: "indigo" },
  { name: "Union-Find", color: "sky" },
  { name: "Topological Sort", color: "blue" },
  { name: "Shortest Path", color: "violet" },
  { name: "1-D DP", color: "orange" },
  { name: "2-D DP", color: "red" },
  { name: "Greedy", color: "lime" },
  { name: "Intervals", color: "amber" },
  { name: "Prefix Sum", color: "green" },
  { name: "Bit Manipulation", color: "stone" },
  { name: "Math", color: "stone" },
  { name: "Design", color: "pink" },
];
