import type { PatternCode, RoadmapProblem, RoadmapTier, WeekNumber } from "./data";
import { PATTERNS } from "./data";
import type { RoadmapMark, RoadmapMarkStatus } from "./marks";

export interface RoadmapFilters {
  /** 0 is every week. */
  week: 0 | WeekNumber;
  hardOnly: boolean;
  p1Only: boolean;
  /** Hide problems accepted on LeetCode before the plan started. */
  freshOnly: boolean;
  starredOnly: boolean;
  reportedOnly: boolean;
  tier: "" | RoadmapTier;
  status: "" | "todo" | RoadmapMarkStatus;
  pattern: "" | PatternCode;
  q: string;
}

export const EMPTY_FILTERS: RoadmapFilters = {
  week: 0,
  hardOnly: false,
  p1Only: false,
  freshOnly: false,
  starredOnly: false,
  reportedOnly: false,
  tier: "",
  status: "",
  pattern: "",
  q: "",
};

export function hasActiveFilters(f: RoadmapFilters): boolean {
  return (
    f.week !== 0 ||
    f.hardOnly ||
    f.p1Only ||
    f.freshOnly ||
    f.starredOnly ||
    f.reportedOnly ||
    f.tier !== "" ||
    f.status !== "" ||
    f.pattern !== "" ||
    f.q.trim() !== ""
  );
}

export function passesFilters(
  p: RoadmapProblem,
  f: RoadmapFilters,
  mark: RoadmapMark | undefined,
): boolean {
  if (f.week !== 0 && PATTERNS[p.pattern].week !== f.week) return false;
  if (f.hardOnly && p.difficulty !== "hard") return false;
  if (f.p1Only && p.priority !== "P1") return false;
  if (f.freshOnly && p.solvedBefore) return false;
  if (f.starredOnly && !p.neetcodeCategory) return false;
  if (f.reportedOnly && !p.reported2026) return false;
  if (f.tier && p.tier !== f.tier) return false;
  if (f.pattern && p.pattern !== f.pattern) return false;
  const status = mark?.status ?? "todo";
  if (f.status && status !== f.status) return false;
  const q = f.q.trim().toLowerCase();
  if (q && !(p.title.toLowerCase().includes(q) || String(p.number) === q)) return false;
  return true;
}
