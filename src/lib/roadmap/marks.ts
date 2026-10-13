import {
  PATTERN_CODES,
  PATTERNS,
  ROADMAP_PROBLEMS,
  problemsOf,
  type PatternCode,
  type RoadmapProblem,
  type WeekNumber,
} from "./data";

/** Done: finished this pass. Redo: solved but shaky, come back to it. Anything else is to do. */
export type RoadmapMarkStatus = "done" | "redo";

export interface RoadmapMark {
  status: RoadmapMarkStatus;
  /** Review day the problem was marked done, for the pace panel. Null unless done. */
  doneOn: string | null;
}

/** Keyed by LeetCode number. */
export type RoadmapMarks = Record<number, RoadmapMark>;

export interface RoadmapProgress {
  total: number;
  done: number;
  redo: number;
  core: number;
  solvedBefore: number;
}

export function progressOf(
  problems: readonly RoadmapProblem[],
  marks: RoadmapMarks,
): RoadmapProgress {
  const out: RoadmapProgress = {
    total: problems.length,
    done: 0,
    redo: 0,
    core: 0,
    solvedBefore: 0,
  };
  for (const p of problems) {
    const status = marks[p.number]?.status;
    if (status === "done") out.done++;
    else if (status === "redo") out.redo++;
    if (p.tier === "core") out.core++;
    if (p.solvedBefore) out.solvedBefore++;
  }
  return out;
}

export function patternProgress(code: PatternCode, marks: RoadmapMarks): RoadmapProgress {
  return progressOf(problemsOf(code), marks);
}

export function weekProgress(week: WeekNumber, marks: RoadmapMarks): RoadmapProgress {
  const codes = PATTERN_CODES.filter((c) => PATTERNS[c].week === week);
  return progressOf(
    codes.flatMap((c) => problemsOf(c)),
    marks,
  );
}

export function overallProgress(marks: RoadmapMarks): RoadmapProgress {
  return progressOf(ROADMAP_PROBLEMS, marks);
}
