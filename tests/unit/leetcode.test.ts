import { describe, expect, it } from "vitest";
import { mapTopicTags, parseLeetCodeInput } from "@/lib/leetcode";

describe("parseLeetCodeInput", () => {
  it("accepts problem URLs with any sub-path and bare slugs", () => {
    expect(parseLeetCodeInput("https://leetcode.com/problems/two-sum/")).toEqual({
      slug: "two-sum",
      url: "https://leetcode.com/problems/two-sum/",
    });
    expect(
      parseLeetCodeInput("leetcode.com/problems/Two-Sum/description/?envType=daily")?.slug,
    ).toBe("two-sum");
    expect(parseLeetCodeInput("  lru-cache ")?.slug).toBe("lru-cache");
    expect(parseLeetCodeInput("https://leetcode.cn/problems/3sum/solutions/")?.slug).toBe("3sum");
  });
  it("rejects anything else", () => {
    expect(parseLeetCodeInput("")).toBeNull();
    expect(parseLeetCodeInput("two sum")).toBeNull();
    expect(parseLeetCodeInput("https://example.com/problems/two-sum")).toBeNull();
  });
});

describe("mapTopicTags", () => {
  const existing = [
    { id: "1", name: "Arrays & Hashing" },
    { id: "2", name: "Trees" },
    { id: "3", name: "BFS/DFS" },
  ];
  it("matches directly, through synonyms, and dedupes", () => {
    const r = mapTopicTags(
      [
        "Array",
        "Hash Table",
        "Binary Tree",
        "Depth-First Search",
        "Breadth-First Search",
        "String",
      ],
      existing,
    );
    expect(r.matched.map((t) => t.name)).toEqual(["Arrays & Hashing", "Trees", "BFS/DFS"]);
    expect(r.unmatched).toEqual(["String"]);
  });
  it("is case-insensitive on tag names", () => {
    expect(mapTopicTags(["trees"], existing).matched[0]?.id).toBe("2");
  });
});
