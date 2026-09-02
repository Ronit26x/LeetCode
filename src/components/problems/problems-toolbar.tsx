"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react/dist/ssr";
import { NativeSelect } from "@/components/common/native-select";
import { inputClass } from "@/components/common/field";
import type { TagBrief } from "@/lib/problems/queries";
import { cn } from "@/lib/utils";

export const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "due", label: "Due" },
  { value: "stability", label: "Stability" },
  { value: "retrievability", label: "Recall" },
  { value: "difficulty", label: "Difficulty" },
  { value: "lastReviewed", label: "Last reviewed" },
  { value: "revises", label: "Revised" },
  { value: "resolves", label: "Resolved" },
  { value: "number", label: "Number" },
  { value: "title", label: "Title" },
  { value: "created", label: "Added" },
];

export function ProblemsToolbar({
  tags,
  total,
  statusCounts,
}: {
  tags: TagBrief[];
  total: number;
  statusCounts?: Record<string, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = React.useState(params.get("q") ?? "");

  const setParam = React.useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  React.useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => setParam("q", q), 200);
    return () => clearTimeout(t);
  }, [q, params, setParam]);

  const has = (k: string) => !!params.get(k);
  const active = ["tag", "difficulty", "memory", "status"].some(has) || !!params.get("q");

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <MagnifyingGlass
            size={15}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-fg-subtle"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, number, tag, notes"
            aria-label="Search problems"
            className={cn(inputClass, "pl-8")}
          />
          {q ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQ("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-fg-muted hover:text-foreground"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
        <NativeSelect
          aria-label="Tag"
          value={params.get("tag") ?? ""}
          onChange={(e) => setParam("tag", e.target.value)}
          className="w-40"
        >
          <option value="">Any tag</option>
          {tags.map((t) => (
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
          aria-label="Memory state"
          value={params.get("memory") ?? ""}
          onChange={(e) => setParam("memory", e.target.value)}
          className="w-32"
        >
          <option value="">Any state</option>
          <option value="new">New</option>
          <option value="review">Review</option>
          <option value="lapsed">Lapsed</option>
        </NativeSelect>
        <NativeSelect
          aria-label="Status"
          value={params.get("status") ?? "all"}
          onChange={(e) => setParam("status", e.target.value === "all" ? "" : e.target.value)}
          className="w-32"
        >
          <option value="all">Any status</option>
          <option value="active">
            Active{statusCounts ? ` (${statusCounts.active ?? 0})` : ""}
          </option>
          <option value="backlog">
            Backlog{statusCounts ? ` (${statusCounts.backlog ?? 0})` : ""}
          </option>
          <option value="suspended">
            Suspended{statusCounts ? ` (${statusCounts.suspended ?? 0})` : ""}
          </option>
          <option value="archived">
            Archived{statusCounts ? ` (${statusCounts.archived ?? 0})` : ""}
          </option>
        </NativeSelect>
        <NativeSelect
          aria-label="Sort"
          value={params.get("sort") ?? "due"}
          onChange={(e) => setParam("sort", e.target.value)}
          className="w-36"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              Sort: {o.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Direction"
          value={params.get("dir") ?? "asc"}
          onChange={(e) => setParam("dir", e.target.value)}
          className="w-24"
        >
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </NativeSelect>
      </div>
      <div className="flex items-center gap-3 text-2xs text-fg-subtle">
        <span>{total} shown</span>
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
