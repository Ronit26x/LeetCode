const ROWS: [string, string][] = [
  ["P1", "Asked in the last 30 days, or LeetCode frequency 45 and up."],
  ["P2", "Asked in the last 3 months."],
  ["P3", "Asked in the last 6 months."],
  ["NC", "Not Google-tagged; included because it is starred on NeetCode."],
  [
    "GAP",
    "Added to cover a technique the Google lists miss: bipartite, iterators, snapshots, ordered-map intervals, reservoir sampling, transitive closure, trie autocomplete.",
  ],
  [
    "Core",
    "The main plan: P1, starred, reported in 2026 and GAP, 218 by Nov 10 (about 7.8 a day).",
  ],
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
    "Spreads each tier evenly over the 28 days from Oct 14 to Nov 10 (a day ends at 9 am, so Nov 10 runs to the morning of Nov 11) and compares Done marks with that line at the end of today. The tick on each bar is where the plan is; the fill is where you are. Marks from before Oct 14 count. The interview is Thu Nov 12.",
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
