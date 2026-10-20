const ROWS: [string, string][] = [
  ["P1", "Asked in the last 30 days, or LeetCode frequency 45 and up."],
  ["P2", "Asked in the last 3 months."],
  ["P3", "Asked in the last 6 months."],
  ["NC", "Not Google-tagged; included because it is starred on NeetCode."],
  [
    "GAP",
    "Added to cover a technique the Google lists miss: bipartite, iterators, snapshots, ordered-map intervals, reservoir sampling, transitive closure, trie autocomplete.",
  ],
  ["Core", "The must-do set: P1, starred, reported in 2026 and GAP, 218 in all."],
  ["Plus", "The next 32 P2 hards, if you are ahead (250 in all)."],
  ["Stretch", "Everything else, only if you are well ahead."],
  [
    "Solved before",
    "Accepted on your LeetCode account on Oct 11, 2026 or earlier. Treat these as cold re-solves.",
  ],
  [
    "NeetCode",
    "Starred on NeetCode, shown with NeetCode's own category, which can differ from the pattern here.",
  ],
  [
    "Reported 2026",
    "Named, or closely matched, in a 2026 Google interview report on LeetCode Discuss. Self-reported, so treat it as a hint.",
  ],
  ["Freq", "LeetCode's relative frequency score for Google."],
  [
    "Pace",
    "The plan is 15 a day from Oct 20 to Nov 10, every tier together (a day ends at 9 am, so Nov 10 runs to the morning of Nov 11). Each tier's line starts at what was done before Oct 20, rises with its share of those 15 and caps at the tier, and the verdict compares Done marks with the line at the end of today. The tick on each bar is where the plan is; the fill is where you are. The interview is Wed Nov 11.",
  ],
];

export function RoadmapKey() {
  return (
    <details className="rounded-xl border border-border bg-surface px-5 py-4">
      <summary className="cursor-pointer text-sm font-medium">How to read this list</summary>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-md text-fg-muted sm:grid-cols-[auto_minmax(0,1fr)]">
        {ROWS.map(([term, body]) => (
          <div key={term} className="contents">
            <dt className="font-medium text-foreground">{term}</dt>
            <dd>{body}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
