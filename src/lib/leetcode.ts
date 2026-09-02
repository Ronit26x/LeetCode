import type { Difficulty } from "@/db/schema";

const LC_URL = /^(?:https?:\/\/)?(?:www\.)?leetcode\.(?:com|cn)\/problems\/([a-z0-9-]+)/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

export function leetCodeUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}

/** Accepts a LeetCode problem URL (any sub-page) or a bare slug. */
export function parseLeetCodeInput(input: string): { slug: string; url: string } | null {
  const s = input.trim();
  if (!s) return null;
  const m = s.match(LC_URL);
  if (m) {
    const slug = m[1].toLowerCase();
    return { slug, url: leetCodeUrl(slug) };
  }
  if (SLUG.test(s) && s.length <= 120) {
    const slug = s.toLowerCase();
    return { slug, url: leetCodeUrl(slug) };
  }
  return null;
}

export interface LeetCodeQuestion {
  number: number | null;
  title: string;
  difficulty: Difficulty;
  slug: string;
  url: string;
  topicTags: string[];
}

const QUERY = `query recurQuestion($slug: String!) {
  question(titleSlug: $slug) {
    questionFrontendId
    title
    difficulty
    topicTags { name slug }
  }
}`;

/** Unofficial endpoint. Times out fast; callers fall back to manual entry. */
export async function fetchLeetCodeQuestion(
  slug: string,
  { timeoutMs = 4000 }: { timeoutMs?: number } = {},
): Promise<LeetCodeQuestion> {
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      referer: leetCodeUrl(slug),
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    },
    body: JSON.stringify({ query: QUERY, variables: { slug }, operationName: "recurQuestion" }),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`LeetCode responded ${res.status}`);
  const json = (await res.json()) as {
    data?: {
      question?: {
        questionFrontendId?: string;
        title?: string;
        difficulty?: string;
        topicTags?: { name: string; slug: string }[];
      } | null;
    };
  };
  const q = json.data?.question;
  if (!q || !q.title) throw new Error("No problem with that slug");
  const number = Number.parseInt(q.questionFrontendId ?? "", 10);
  const diff = (q.difficulty ?? "medium").toLowerCase();
  return {
    number: Number.isFinite(number) ? number : null,
    title: q.title,
    difficulty: diff === "easy" || diff === "hard" ? diff : "medium",
    slug,
    url: leetCodeUrl(slug),
    topicTags: (q.topicTags ?? []).map((t) => t.name),
  };
}

/** LeetCode topic names that map onto the default topic tags. Lower-case keys. */
export const TOPIC_SYNONYMS: Record<string, string> = {
  array: "Arrays & Hashing",
  "hash table": "Arrays & Hashing",
  "hash function": "Arrays & Hashing",
  "two pointers": "Two Pointers",
  "sliding window": "Sliding Window",
  stack: "Stack",
  "monotonic stack": "Monotonic Stack",
  "monotonic queue": "Monotonic Stack",
  "binary search": "Binary Search",
  "linked list": "Linked List",
  "doubly-linked list": "Linked List",
  tree: "Trees",
  "binary tree": "Trees",
  "binary search tree": "Trees",
  trie: "Tries",
  "heap (priority queue)": "Heap / Priority Queue",
  backtracking: "Backtracking",
  graph: "Graphs",
  "depth-first search": "BFS/DFS",
  "breadth-first search": "BFS/DFS",
  "union find": "Union-Find",
  "topological sort": "Topological Sort",
  "shortest path": "Shortest Path",
  greedy: "Greedy",
  "line sweep": "Intervals",
  "prefix sum": "Prefix Sum",
  "bit manipulation": "Bit Manipulation",
  bitmask: "Bit Manipulation",
  math: "Math",
  "number theory": "Math",
  combinatorics: "Math",
  geometry: "Math",
  design: "Design",
  "data stream": "Design",
};

export interface TagRef {
  id: string;
  name: string;
}

/** Maps LeetCode topic names onto the user's tags; the rest are offered as new tags. */
export function mapTopicTags(
  topicNames: string[],
  existing: TagRef[],
): { matched: TagRef[]; unmatched: string[] } {
  const byLower = new Map(existing.map((t) => [t.name.toLowerCase(), t]));
  const matched = new Map<string, TagRef>();
  const unmatched: string[] = [];
  for (const raw of topicNames) {
    const lower = raw.trim().toLowerCase();
    if (!lower) continue;
    const direct = byLower.get(lower);
    const viaSynonym = TOPIC_SYNONYMS[lower] ? byLower.get(TOPIC_SYNONYMS[lower].toLowerCase()) : undefined;
    const hit = direct ?? viaSynonym;
    if (hit) matched.set(hit.id, hit);
    else if (!unmatched.some((u) => u.toLowerCase() === lower)) unmatched.push(raw.trim());
  }
  return { matched: [...matched.values()], unmatched };
}
