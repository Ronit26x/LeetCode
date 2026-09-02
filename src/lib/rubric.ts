/* Plain data shared by client components and server pages. No "use client" here on purpose. */

export type RatingValue = 1 | 2 | 3 | 4;
export type RubricMode = "first" | "revise" | "resolve";

export const RATING_NAMES: Record<RatingValue, string> = { 1: "Again", 2: "Hard", 3: "Good", 4: "Easy" };

export const RUBRIC: Record<RubricMode, Record<RatingValue, string>> = {
  first: {
    1: "Needed the editorial",
    2: "Solved with real struggle or hints",
    3: "Solved it",
    4: "Trivial",
  },
  revise: {
    1: "Could not recall the key insight",
    2: "Recalled only after a long struggle, or missed an important detail or edge case",
    3: "Recalled the insight, approach and complexity within about two minutes",
    4: "Easy is earned by resolving. Enable it for revises in Settings if you want it here",
  },
  resolve: {
    1: "Could not produce a working solution without opening the notes",
    2: "Working, but over the time target, needed hints, or had bugs",
    3: "Clean solution within the time target",
    4: "Fast, clean, and could explain the variants",
  },
};

export const KEYS: [string, string][] = [
  ["Space", "Flip the card"],
  ["1 – 4", "Again, Hard, Good, Easy"],
  ["R", "Toggle Revise / Resolve"],
  ["N", "Open or close the notes"],
  ["C", "Open or close the code"],
  ["O", "Open the problem on LeetCode"],
  ["Z", "Undo the last grade"],
  ["E", "Edit the problem in a side sheet"],
  ["Esc", "Leave the session"],
  ["?", "Keyboard help"],
];
