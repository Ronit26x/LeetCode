"use client";

import * as React from "react";
import { Plus, X } from "@phosphor-icons/react/dist/ssr";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { DifficultyBadge } from "@/components/common/badges";
import { searchProblems } from "@/lib/problems/actions";
import type { ProblemBrief } from "@/lib/problems/queries";
import { cn } from "@/lib/utils";

/** Picks related problems from the library. */
export function ProblemPicker({
  value,
  onChange,
  excludeId,
  className,
}: {
  value: ProblemBrief[];
  onChange: (list: ProblemBrief[]) => void;
  excludeId?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<ProblemBrief[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      searchProblems(query)
        .then((rows) => {
          if (!cancelled) setResults(rows.filter((r) => r.id !== excludeId));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open, excludeId]);

  function add(p: ProblemBrief) {
    if (value.some((v) => v.id === p.id)) return;
    onChange([...value, p]);
    setOpen(false);
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {value.length ? (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {value.map((p) => (
            <li key={p.id} className="flex h-9 items-center gap-2 px-2.5 text-sm">
              {p.leetcodeNumber ? (
                <span className="w-10 text-fg-subtle">{p.leetcodeNumber}</span>
              ) : null}
              <span className="flex-1 truncate">{p.title}</span>
              <DifficultyBadge difficulty={p.difficulty} plain />
              <button
                type="button"
                aria-label={`Remove ${p.title}`}
                onClick={() => onChange(value.filter((v) => v.id !== p.id))}
                className="text-fg-muted hover:text-foreground"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="inline-flex h-7 w-fit items-center gap-1 rounded-md border border-dashed border-border-strong px-2 text-2xs font-medium text-fg-muted hover:text-foreground">
          <Plus size={12} />
          Similar problem
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by title or number"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-64">
              <CommandEmpty>{loading ? "Searching" : "No match in your library."}</CommandEmpty>
              <CommandGroup>
                {results.map((p) => (
                  <CommandItem key={p.id} value={p.id} onSelect={() => add(p)}>
                    {p.leetcodeNumber ? (
                      <span className="w-10 text-right text-fg-subtle">{p.leetcodeNumber}</span>
                    ) : null}
                    <span className="flex-1 truncate">{p.title}</span>
                    <DifficultyBadge difficulty={p.difficulty} plain />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
