"use client";

import * as React from "react";
import { Check, Plus, X } from "@phosphor-icons/react/dist/ssr";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { TagBadge } from "@/components/common/badges";
import type { TagBrief } from "@/lib/problems/queries";
import { cn } from "@/lib/utils";

export function TagPicker({
  tags,
  value,
  newTags,
  onChange,
  suggested,
  className,
}: {
  tags: TagBrief[];
  value: string[];
  newTags: string[];
  onChange: (ids: string[], newTags: string[]) => void;
  /** Names LeetCode suggested that do not match a tag yet. */
  suggested?: string[];
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const selected = tags.filter((t) => value.includes(t.id));
  const byKind = React.useMemo(() => {
    const groups: Record<string, TagBrief[]> = {};
    for (const t of tags) (groups[t.kind] ??= []).push(t);
    return groups;
  }, [tags]);

  const canCreate =
    query.trim().length > 0 &&
    !tags.some((t) => t.name.toLowerCase() === query.trim().toLowerCase()) &&
    !newTags.some((n) => n.toLowerCase() === query.trim().toLowerCase());

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id], newTags);
  }
  function addNew(name: string) {
    const n = name.trim();
    if (!n) return;
    if (newTags.some((x) => x.toLowerCase() === n.toLowerCase())) return;
    onChange(value, [...newTags, n]);
    setQuery("");
  }
  function removeNew(name: string) {
    onChange(
      value,
      newTags.filter((n) => n !== name),
    );
  }

  const pendingSuggestions = (suggested ?? []).filter(
    (s) => !newTags.some((n) => n.toLowerCase() === s.toLowerCase()),
  );
  const KIND_LABEL: Record<string, string> = {
    topic: "Topics",
    pattern: "Patterns",
    company: "Companies",
    custom: "Custom",
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((t) => (
          <span key={t.id} className="inline-flex items-center">
            <TagBadge name={t.name} color={t.color} className="rounded-r-none pr-1" />
            <button
              type="button"
              aria-label={`Remove tag ${t.name}`}
              onClick={() => toggle(t.id)}
              className="inline-flex h-5 items-center rounded-r-sm bg-sunken px-1 text-fg-muted hover:text-foreground"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {newTags.map((n) => (
          <span key={n} className="inline-flex items-center">
            <TagBadge name={n} color="stone" className="rounded-r-none pr-1" />
            <button
              type="button"
              aria-label={`Remove new tag ${n}`}
              onClick={() => removeNew(n)}
              className="inline-flex h-5 items-center rounded-r-sm bg-sunken px-1 text-fg-muted hover:text-foreground"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-border-strong px-2 text-2xs font-medium text-fg-muted hover:text-foreground"
            aria-label="Add tag"
          >
            <Plus size={12} />
            Tag
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-0">
            <Command shouldFilter>
              <CommandInput placeholder="Search or create" value={query} onValueChange={setQuery} />
              <CommandList className="max-h-64">
                <CommandEmpty>No tag. Type to create one.</CommandEmpty>
                {Object.entries(byKind).map(([kind, list]) => (
                  <CommandGroup key={kind} heading={KIND_LABEL[kind] ?? kind}>
                    {list.map((t) => (
                      <CommandItem key={t.id} value={t.name} onSelect={() => toggle(t.id)}>
                        <span
                          className={cn("size-2 rounded-full", `bg-tag-${t.color}`)}
                          aria-hidden
                        />
                        <span className="flex-1 truncate">{t.name}</span>
                        {value.includes(t.id) ? <Check size={14} className="text-primary" /> : null}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
                {canCreate ? (
                  <CommandGroup heading="New">
                    <CommandItem value={`create ${query}`} onSelect={() => addNew(query)}>
                      <Plus size={14} />
                      Create “{query.trim()}”
                    </CommandItem>
                  </CommandGroup>
                ) : null}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {pendingSuggestions.length ? (
        <div className="flex flex-wrap items-center gap-1.5 text-2xs text-fg-muted">
          <span>LeetCode also lists:</span>
          {pendingSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addNew(s)}
              className="inline-flex h-5 items-center gap-1 rounded-sm border border-border px-1.5 text-2xs text-fg-muted hover:text-foreground"
            >
              <Plus size={10} />
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
