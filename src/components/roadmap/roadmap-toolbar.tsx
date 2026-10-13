"use client";

import { MagnifyingGlass, X } from "@phosphor-icons/react/dist/ssr";
import { SegmentedControl } from "@/components/common/segmented-control";
import { NativeSelect } from "@/components/common/native-select";
import { inputClass } from "@/components/common/field";
import { Toggle } from "@/components/ui/toggle";
import { PATTERNS, ROADMAP_WEEKS, type WeekNumber } from "@/lib/roadmap/data";
import { EMPTY_FILTERS, hasActiveFilters, type RoadmapFilters } from "@/lib/roadmap/filters";
import { cn } from "@/lib/utils";

const WEEK_OPTIONS = [
  { value: "0", label: "All" },
  ...ROADMAP_WEEKS.map((w) => ({
    value: String(w.n),
    label: `Week ${w.n}`,
    hint: `${w.dates} · ${w.focus}`,
  })),
];

const toggleClass =
  "h-8 border-border bg-surface px-2.5 text-md font-normal text-fg-muted hover:bg-hover hover:text-foreground aria-pressed:border-primary/50 aria-pressed:bg-primary/10 aria-pressed:text-primary";

type Flag = "hardOnly" | "p1Only" | "freshOnly" | "starredOnly" | "reportedOnly";
const FLAGS: { key: Flag; label: string }[] = [
  { key: "hardOnly", label: "Hard only" },
  { key: "p1Only", label: "P1 only" },
  { key: "freshOnly", label: "Not solved before" },
  { key: "starredOnly", label: "NeetCode starred" },
  { key: "reportedOnly", label: "Reported in 2026" },
];

export function RoadmapToolbar({
  filters,
  onChange,
  shown,
  total,
}: {
  filters: RoadmapFilters;
  onChange: (next: RoadmapFilters) => void;
  shown: number;
  total: number;
}) {
  function set<K extends keyof RoadmapFilters>(key: K, value: RoadmapFilters[K]) {
    onChange({ ...filters, [key]: value });
  }
  return (
    <div className="z-20 flex flex-col gap-2 border-b border-border bg-background py-2.5 md:sticky md:top-12">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          aria-label="Week"
          size="sm"
          value={String(filters.week)}
          options={WEEK_OPTIONS}
          onValueChange={(v) => set("week", Number(v) as 0 | WeekNumber)}
        />
        {FLAGS.map((f) => (
          <Toggle
            key={f.key}
            variant="outline"
            size="sm"
            pressed={filters[f.key]}
            onPressedChange={(v) => set(f.key, v)}
            className={toggleClass}
          >
            {f.label}
          </Toggle>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect
          aria-label="Tier"
          value={filters.tier}
          onChange={(e) => set("tier", e.target.value as RoadmapFilters["tier"])}
          className="w-36"
        >
          <option value="">All tiers</option>
          <option value="core">Core</option>
          <option value="plus">Plus</option>
          <option value="stretch">Stretch</option>
        </NativeSelect>
        <NativeSelect
          aria-label="Status"
          value={filters.status}
          onChange={(e) => set("status", e.target.value as RoadmapFilters["status"])}
          className="w-32"
        >
          <option value="">Any status</option>
          <option value="todo">To do</option>
          <option value="redo">Redo</option>
          <option value="done">Done</option>
        </NativeSelect>
        <div className="relative min-w-0 flex-1 basis-48">
          <MagnifyingGlass
            size={15}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-fg-subtle"
          />
          <input
            value={filters.q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="Search title or number"
            aria-label="Search roadmap problems"
            className={cn(inputClass, "pl-8")}
          />
          {filters.q ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => set("q", "")}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-fg-muted hover:text-foreground"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
        {filters.pattern ? (
          <button
            type="button"
            onClick={() => set("pattern", "")}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-primary/50 bg-primary/10 px-2.5 text-md text-primary hover:bg-primary/15"
            aria-label={`Stop filtering by ${PATTERNS[filters.pattern].name}`}
          >
            <span className="truncate">Topic: {PATTERNS[filters.pattern].name}</span>
            <X size={14} />
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-3 text-2xs text-fg-subtle">
        <span>
          {shown} of {total} shown
        </span>
        {hasActiveFilters(filters) ? (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="text-fg-muted hover:text-foreground"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
