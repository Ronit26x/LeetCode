/**
 * Sample problems with real FSRS histories, so a session can be tried before the real cards come
 * due. Tagged "Sample" and batched as "sample" so they can be removed in one go.
 * Usage: pnpm db:seed [--allow-remote] [--remove]
 * Refuses non-local databases unless --allow-remote is given.
 */
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const url = process.env.DATABASE_URL ?? "";
const args = process.argv.slice(2);
const allowRemote = args.includes("--allow-remote");
const remove = args.includes("--remove");
const BATCH = "sample";
if (
  !allowRemote &&
  !(url.startsWith("pglite://") || url.includes("localhost") || url.includes("127.0.0.1"))
) {
  console.error("Refusing to seed a non-local database:", url.replace(/:[^:@/]+@/, ":***@"));
  process.exit(1);
}

const { getDb } = await import("@/db");
const db = await getDb();
const { problems, snippets, tags, problemTags, problemRelations } = await import("@/db/schema");
const { ensureDefaults, getSettings } = await import("@/db/bootstrap");
const { applyFirstSolve } = await import("@/lib/fsrs/grade");
const { buildFsrs, rowToCard, cardToRow, logToRow } = await import("@/lib/fsrs/core");
const { cards, reviewLogs } = await import("@/db/schema");
const { and, eq, sql } = await import("drizzle-orm");

await ensureDefaults();
if (remove) {
  const gone = await db
    .delete(problems)
    .where(eq(problems.importBatch, BATCH))
    .returning({ id: problems.id });
  const sampleTag = await db.query.tags.findFirst({ where: sql`lower(${tags.name}) = 'sample'` });
  if (sampleTag) await db.delete(tags).where(eq(tags.id, sampleTag.id));
  console.log(`Removed ${gone.length} sample problems (cards and logs cascade)`);
  process.exit(0);
}
const settings = await getSettings();
let sampleTag = await db.query.tags.findFirst({ where: sql`lower(${tags.name}) = 'sample'` });
if (!sampleTag) {
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${tags.sortOrder}), -1)::int` })
    .from(tags);
  [sampleTag] = await db
    .insert(tags)
    .values({ name: "Sample", kind: "custom", color: "stone", sortOrder: max + 1 })
    .returning();
}
const allTags = await db.select().from(tags);
const tagId = (name: string) => allTags.find((t) => t.name === name)?.id;

const DAY = 86_400_000;
const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * DAY);

type Seed = {
  number: number;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  promptSummary: string;
  keyInsight: string;
  approach: string;
  time: string;
  space: string;
  pitfalls: string;
  notes?: string;
  code?: string;
  /** Review history: [daysAgo, mode, rating][] in chronological order. Empty = backlog. */
  history: [number, "revise" | "resolve", 1 | 2 | 3 | 4][];
  /** Where the due date should land relative to now, in days. The FSRS state is untouched; the timeline slides. */
  dueIn?: number;
};

const SEED: Seed[] = [
  {
    number: 1,
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "easy",
    tags: ["Arrays & Hashing"],
    promptSummary:
      "Given an array of integers and a target, return the indices of the two numbers that add up to the target. Exactly one answer exists.",
    keyInsight:
      "One pass with a hash map from value to index: for each x, look up target minus x before inserting x.",
    approach:
      "1. Walk the array once.\n2. For each `x`, check whether `target - x` is already in the map.\n3. If it is, return both indices. Otherwise store `x -> i`.",
    time: "O(n)",
    space: "O(n)",
    pitfalls:
      "- Insert after the lookup, or you can pair an element with itself.\n- Negative numbers and duplicates are fine with this order.",
    code: "class Solution {\npublic:\n\tvector<int> twoSum(vector<int>& nums, int target) {\n\t\tunordered_map<int, int> seen;\n\t\tfor (int i = 0; i < (int)nums.size(); ++i) {\n\t\t\tauto it = seen.find(target - nums[i]);\n\t\t\tif (it != seen.end()) return {it->second, i};\n\t\t\tseen[nums[i]] = i;\n\t\t}\n\t\treturn {};\n\t}\n};",
    history: [
      [20, "resolve", 3],
      [16, "revise", 3],
      [9, "resolve", 3],
    ],
    dueIn: -1,
  },
  {
    number: 3,
    slug: "longest-substring-without-repeating-characters",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "medium",
    tags: ["Sliding Window", "Arrays & Hashing"],
    promptSummary: "Return the length of the longest substring with no repeated characters.",
    keyInsight:
      "Sliding window with last-seen positions: when the right char was seen inside the window, jump the left edge past it.",
    approach:
      "1. Keep `last[c]` = last index of char `c`.\n2. For each right index `r`, if `last[s[r]] >= l`, set `l = last[s[r]] + 1`.\n3. Track `r - l + 1`.",
    time: "O(n)",
    space: "O(k) for the alphabet",
    pitfalls:
      "- Only move `l` forward; a stale `last` entry left of `l` must not pull it back.\n- Initialize `last` to -1, not 0.",
    code: "int lengthOfLongestSubstring(string s) {\n\tvector<int> last(256, -1);\n\tint best = 0, l = 0;\n\tfor (int r = 0; r < (int)s.size(); ++r) {\n\t\tif (last[s[r]] >= l) l = last[s[r]] + 1;\n\t\tlast[s[r]] = r;\n\t\tbest = max(best, r - l + 1);\n\t}\n\treturn best;\n}",
    history: [
      [14, "resolve", 2],
      [11, "resolve", 3],
      [4, "revise", 1],
      [2, "resolve", 3],
    ],
    dueIn: 2,
  },
  {
    number: 146,
    slug: "lru-cache",
    title: "LRU Cache",
    difficulty: "medium",
    tags: ["Design", "Linked List"],
    promptSummary:
      "Design a cache with get and put in O(1) that evicts the least recently used key at capacity.",
    keyInsight:
      "Hash map from key to a doubly linked list node; move a node to the front on every access, pop from the back on eviction.",
    approach:
      "1. `unordered_map<int, list<pair<int,int>>::iterator>` plus a `std::list`.\n2. `get`: if present, splice the node to the front and return it.\n3. `put`: update and splice, or push front; if size exceeds capacity, erase the back key from the map and pop it.",
    time: "O(1) per operation",
    space: "O(capacity)",
    pitfalls:
      "- `list::splice` keeps iterators valid; erase-and-reinsert does not.\n- Update the value before moving the node.",
    notes: "Follow-up: LFU cache (460) needs a frequency list of lists.",
    code: "class LRUCache {\n\tint cap;\n\tlist<pair<int,int>> order;\n\tunordered_map<int, list<pair<int,int>>::iterator> at;\npublic:\n\tLRUCache(int capacity) : cap(capacity) {}\n\tint get(int key) {\n\t\tauto it = at.find(key);\n\t\tif (it == at.end()) return -1;\n\t\torder.splice(order.begin(), order, it->second);\n\t\treturn it->second->second;\n\t}\n\tvoid put(int key, int value) {\n\t\tauto it = at.find(key);\n\t\tif (it != at.end()) {\n\t\t\tit->second->second = value;\n\t\t\torder.splice(order.begin(), order, it->second);\n\t\t\treturn;\n\t\t}\n\t\torder.emplace_front(key, value);\n\t\tat[key] = order.begin();\n\t\tif ((int)order.size() > cap) {\n\t\t\tat.erase(order.back().first);\n\t\t\torder.pop_back();\n\t\t}\n\t}\n};",
    history: [[6, "resolve", 2]],
    dueIn: -4,
  },
  {
    number: 200,
    slug: "number-of-islands",
    title: "Number of Islands",
    difficulty: "medium",
    tags: ["Graphs", "BFS/DFS"],
    promptSummary: "Count connected groups of 1s in a grid, four-directional.",
    keyInsight:
      "Flood fill: every unvisited 1 starts a new island; sink it with DFS or BFS so it is never counted twice.",
    approach:
      "1. Scan the grid.\n2. On a `'1'`, increment the count and DFS, setting cells to `'0'` as you go.",
    time: "O(mn)",
    space: "O(mn) worst-case recursion",
    pitfalls:
      "- Recursion depth on a full grid; use an explicit stack for large inputs.\n- Mark visited before recursing, not after.",
    history: [
      [40, "resolve", 3],
      [33, "revise", 2],
      [21, "revise", 2],
    ],
    dueIn: 0,
  },
  {
    number: 239,
    slug: "sliding-window-maximum",
    title: "Sliding Window Maximum",
    difficulty: "hard",
    tags: ["Monotonic Stack", "Sliding Window"],
    promptSummary: "For each window of size k, output the maximum.",
    keyInsight:
      "A deque of indices with decreasing values: pop smaller tails before pushing, drop the head when it leaves the window.",
    approach:
      "1. For each `i`, pop from the back while `nums[back] <= nums[i]`, then push `i`.\n2. Pop the front if it is `< i - k + 1`.\n3. Once `i >= k - 1`, the front is the answer.",
    time: "O(n)",
    space: "O(k)",
    pitfalls:
      "- Store indices, not values, or you cannot tell when the max expires.\n- Use `<=` when popping to keep the deque strictly decreasing.",
    history: [[3, "resolve", 1]],
    dueIn: -2,
  },
  {
    number: 322,
    slug: "coin-change",
    title: "Coin Change",
    difficulty: "medium",
    tags: ["1-D DP"],
    promptSummary: "Fewest coins that sum to an amount, or -1.",
    keyInsight: "Bottom-up over amounts: dp[a] = 1 + min over coins of dp[a - c].",
    approach:
      "1. `dp[0] = 0`, everything else infinity.\n2. For `a` from 1 to amount, for each coin `c <= a`, relax `dp[a]`.\n3. Answer is `dp[amount]` unless still infinity.",
    time: "O(amount × coins)",
    space: "O(amount)",
    pitfalls: "- Use a large sentinel, not INT_MAX, or `1 + INT_MAX` overflows.",
    history: [],
  },
  {
    number: 297,
    slug: "serialize-and-deserialize-binary-tree",
    title: "Serialize and Deserialize Binary Tree",
    difficulty: "hard",
    tags: ["Trees", "Design"],
    promptSummary: "Turn a binary tree into a string and back.",
    keyInsight:
      "Preorder with explicit null markers is enough to rebuild the tree with one recursive pass over a stream.",
    approach:
      "1. Serialize: preorder, write `#` for null, comma separated.\n2. Deserialize: read tokens from a stringstream; recurse left then right.",
    time: "O(n)",
    space: "O(n)",
    pitfalls: "- Negative numbers: parse tokens, do not split on characters.",
    history: [],
  },
  {
    number: 424,
    slug: "longest-repeating-character-replacement",
    title: "Longest Repeating Character Replacement",
    difficulty: "medium",
    tags: ["Sliding Window"],
    promptSummary: "Longest substring that can be made uniform with at most k replacements.",
    keyInsight:
      "Window is valid while length minus the max frequency inside it is at most k; the max frequency never needs to decrease.",
    approach:
      "1. Count chars in the window.\n2. Track `maxf` as a running max.\n3. If `r - l + 1 - maxf > k`, shrink from the left once.",
    time: "O(n)",
    space: "O(26)",
    pitfalls: "- Shrinking by one each step is enough; the answer only grows.",
    history: [
      [30, "resolve", 3],
      [26, "revise", 3],
      [17, "resolve", 3],
      [9, "revise", 3],
    ],
    dueIn: 5,
  },
];

for (const s of SEED) {
  const existing = await db.query.problems.findFirst({
    where: and(eq(problems.slug, s.slug), eq(problems.source, "leetcode")),
  });
  if (existing) continue;
  const createdAt = s.history.length ? daysAgo(s.history[0][0] + 1) : daysAgo(2);
  const [p] = await db
    .insert(problems)
    .values({
      slug: s.slug,
      leetcodeNumber: s.number,
      title: s.title,
      url: `https://leetcode.com/problems/${s.slug}/`,
      difficulty: s.difficulty,
      status: "backlog",
      promptSummary: s.promptSummary,
      keyInsight: s.keyInsight,
      approach: s.approach,
      timeComplexity: s.time,
      spaceComplexity: s.space,
      pitfalls: s.pitfalls,
      notes: s.notes ?? "",
      importBatch: BATCH,
      createdAt,
      updatedAt: createdAt,
    })
    .returning();
  const ids = [...s.tags.map(tagId).filter((x): x is string => !!x), sampleTag.id];
  if (ids.length)
    await db
      .insert(problemTags)
      .values(ids.map((t) => ({ problemId: p.id, tagId: t })))
      .onConflictDoNothing();
  if (s.code)
    await db
      .insert(snippets)
      .values({ problemId: p.id, label: "Optimal", language: "cpp", code: s.code, sortOrder: 0 });

  // Replay the review history through the real scheduler so the memory states are genuine.
  const f = buildFsrs(settings);
  for (const [i, [ago, mode, rating]] of s.history.entries()) {
    const at = daysAgo(ago);
    if (i === 0) {
      await db.transaction((tx) => applyFirstSolve(tx, p.id, rating, at, settings));
      continue;
    }
    const row = await db.query.cards.findFirst({ where: eq(cards.problemId, p.id) });
    if (!row) throw new Error("card missing");
    const { card, log } = f.next(rowToCard(row), at, rating);
    await db
      .update(cards)
      .set({ ...cardToRow(card), updatedAt: at })
      .where(eq(cards.problemId, p.id));
    await db.insert(reviewLogs).values({
      clientReviewId: randomUUID(),
      problemId: p.id,
      mode,
      durationSeconds: mode === "resolve" ? 900 + Math.round(Math.random() * 1200) : null,
      note: rating === 1 ? "Forgot the invariant" : null,
      ...logToRow(log),
      resultScheduledDays: card.scheduled_days,
    });
    await db
      .update(problems)
      .set({
        reviseCount: mode === "revise" ? sql`${problems.reviseCount} + 1` : problems.reviseCount,
        resolveCount:
          mode === "resolve" ? sql`${problems.resolveCount} + 1` : problems.resolveCount,
        lastMode: mode,
      })
      .where(eq(problems.id, p.id));
  }
}

// One relation for the detail page.
const lsw = await db.query.problems.findFirst({
  where: eq(problems.slug, "longest-substring-without-repeating-characters"),
});
const lrc = await db.query.problems.findFirst({
  where: eq(problems.slug, "longest-repeating-character-replacement"),
});
if (lsw && lrc) {
  await db
    .insert(problemRelations)
    .values([
      { problemId: lsw.id, relatedProblemId: lrc.id },
      { problemId: lrc.id, relatedProblemId: lsw.id },
    ])
    .onConflictDoNothing();
}
// Slide each sample's timeline so the due date lands at dueIn days from now.
for (const sd of SEED) {
  if (sd.dueIn === undefined) continue;
  const row = await db.query.problems.findFirst({
    where: eq(problems.slug, sd.slug),
    with: { card: true },
  });
  if (!row?.card) continue;
  const target = now.getTime() + sd.dueIn * DAY;
  const shift = row.card.due.getTime() - target;
  if (Math.abs(shift) < 60_000) continue;
  const shifted = (d: Date | null) => (d ? new Date(d.getTime() - shift) : null);
  await db
    .update(cards)
    .set({ due: shifted(row.card.due)!, lastReview: shifted(row.card.lastReview) })
    .where(eq(cards.problemId, row.id));
  const logs = await db.select().from(reviewLogs).where(eq(reviewLogs.problemId, row.id));
  for (const l of logs) {
    await db
      .update(reviewLogs)
      .set({
        reviewedAt: shifted(l.reviewedAt)!,
        due: shifted(l.due)!,
        prevDue: shifted(l.prevDue),
      })
      .where(eq(reviewLogs.id, l.id));
  }
  await db
    .update(problems)
    .set({ firstSolvedAt: shifted(row.firstSolvedAt), createdAt: shifted(row.createdAt)! })
    .where(eq(problems.id, row.id));
}
console.log("Seeded", SEED.length, "problems");
for (const row of await db.query.problems.findMany({
  where: eq(problems.importBatch, BATCH),
  with: { card: true },
})) {
  const due = row.card ? ((row.card.due.getTime() - now.getTime()) / DAY).toFixed(1) : "backlog";
  console.log(`  ${row.title.padEnd(48)} due in ${due}d`);
}
process.exit(0);
