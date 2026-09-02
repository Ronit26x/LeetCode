"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/common/native-select";
import type { TagBrief } from "@/lib/problems/queries";
import { cn } from "@/lib/utils";

export function BacklogToolbar({ tags, shown }: { tags: TagBrief[]; shown: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = React.useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );
  const recent = params.get("recent") === "14";
  const active = ["tier", "tag", "difficulty", "source", "recent"].some((k) => params.get(k));

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setParam("recent", recent ? "" : "14")}
          aria-pressed={recent}
          className={cn(
            "inline-flex h-9 items-center rounded-md border px-3 text-md font-medium transition-colors",
            recent
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-surface text-fg-muted hover:text-foreground",
          )}
        >
          Solved in the last 14 days
        </button>
        <NativeSelect
          aria-label="Tier"
          value={params.get("tier") ?? ""}
          onChange={(e) => setParam("tier", e.target.value)}
          className="w-32"
        >
          <option value="">Any tier</option>
          <option value="core">Core</option>
          <option value="warmup">Warmup</option>
        </NativeSelect>
        <NativeSelect
          aria-label="Topic"
          value={params.get("tag") ?? ""}
          onChange={(e) => setParam("tag", e.target.value)}
          className="w-44"
        >
          <option value="">Any topic</option>
          {tags
            .filter((t) => t.kind === "topic" || t.kind === "pattern")
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Difficulty"
          value={params.get("difficulty") ?? ""}
          onChange={(e) => setParam("difficulty", e.target.value)}
          className="w-32"
        >
          <option value="">Any difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </NativeSelect>
        <NativeSelect
          aria-label="Source"
          value={params.get("source") ?? ""}
          onChange={(e) => setParam("source", e.target.value)}
          className="w-28"
        >
          <option value="">Any source</option>
          <option value="gfg">GFG</option>
          <option value="leetcode">LeetCode</option>
          <option value="other">Other</option>
        </NativeSelect>
        <NativeSelect
          aria-label="Sort"
          value={params.get("sort") ?? "stalest"}
          onChange={(e) => setParam("sort", e.target.value === "stalest" ? "" : e.target.value)}
          className="w-40"
        >
          <option value="stalest">Stalest first</option>
          <option value="recent">Most recent first</option>
          <option value="difficulty">Difficulty</option>
          <option value="title">Title</option>
        </NativeSelect>
      </div>
      <div className="flex items-center gap-3 text-2xs text-fg-subtle">
        <span>{shown} shown</span>
        {active ? (
          <button
            type="button"
            onClick={() => router.replace(pathname)}
            className="text-fg-muted hover:text-foreground"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
