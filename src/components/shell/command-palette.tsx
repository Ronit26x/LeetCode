"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Cards, Monitor, Moon, Plus, Sun, SunDim } from "@phosphor-icons/react/dist/ssr";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { NAV_ITEMS } from "@/lib/nav";
import { NAV_ICONS } from "@/components/shell/sidebar";
import { THEME_LABELS, type ThemeChoice } from "@/lib/theme";
import { searchProblems } from "@/lib/problems/actions";
import type { ProblemBrief } from "@/lib/problems/queries";
import { DifficultyBadge, SourceBadge } from "@/components/common/badges";

const OPEN_EVENT = "recur:command-palette";

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [problems, setProblems] = React.useState<ProblemBrief[]>([]);
  const [selected, setSelected] = React.useState("");
  const router = useRouter();
  const { setTheme } = useTheme();

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setProblems([]);
    }
  }

  function onQueryChange(q: string) {
    setQuery(q);
    if (q.trim().length < 2) setProblems([]);
  }

  React.useEffect(() => {
    if (query.trim().length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      searchProblems(query.trim()).then((rows) => {
        if (!cancelled) setProblems(rows);
      });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function pickTheme(t: ThemeChoice) {
    setTheme(t);
    setOpen(false);
  }

  /** ⌘↵ on a problem result starts an early review instead of opening the page. */
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;
    const hit = problems.find((p) => `problem:${p.id}` === selected);
    if (hit?.hasCard) {
      e.preventDefault();
      go(`/review?problem=${hit.id}`);
    }
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Commands"
      description="Jump to a problem, page or action, or change the theme."
    >
      {/* The dialog is only the frame; cmdk needs its own root, which also tracks the highlighted item. */}
      <Command value={selected} onValueChange={setSelected} onKeyDown={onKeyDown}>
        <CommandInput
          placeholder="Jump to a problem, page, or action"
          value={query}
          onValueChange={onQueryChange}
        />
        <CommandList>
          <CommandEmpty>
            {query.trim().length >= 2 ? "Nothing matches." : "Type two letters to search problems."}
          </CommandEmpty>
          {problems.length > 0 ? (
            <CommandGroup heading="Problems">
              {problems.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`problem:${p.id}`}
                  keywords={[p.title, String(p.leetcodeNumber ?? "")]}
                  onSelect={() => go(`/problems/${p.id}`)}
                >
                  <span className="w-10 shrink-0 text-right text-fg-subtle">
                    {p.leetcodeNumber ?? ""}
                  </span>
                  <span className="truncate">{p.title}</span>
                  {p.source && p.source !== "leetcode" ? <SourceBadge source={p.source} /> : null}
                  <DifficultyBadge difficulty={p.difficulty} plain />
                  <CommandShortcut>
                    {p.hasCard ? "⌘↵ review" : p.status === "backlog" ? "backlog" : p.status}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          <CommandGroup heading="Actions">
            <CommandItem value="add problem new" onSelect={() => go("/problems/new")}>
              <Plus />
              Add problem
              <CommandShortcut>N</CommandShortcut>
            </CommandItem>
            <CommandItem value="start session review today" onSelect={() => go("/review")}>
              <Cards />
              Start session
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Go to">
            {NAV_ITEMS.map((item) => {
              const IconComp = NAV_ICONS[item.key];
              return (
                <CommandItem
                  key={item.key}
                  value={`go ${item.label}`}
                  onSelect={() => go(item.href)}
                >
                  <IconComp />
                  {item.label}
                  <CommandShortcut>
                    G {item.key === "settings" ? "," : item.label[0]}
                  </CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
          <CommandGroup heading="Theme">
            <CommandItem value="theme light" onSelect={() => pickTheme("light")}>
              <Sun /> {THEME_LABELS.light}
            </CommandItem>
            <CommandItem value="theme dim" onSelect={() => pickTheme("dim")}>
              <SunDim /> {THEME_LABELS.dim}
            </CommandItem>
            <CommandItem value="theme dark" onSelect={() => pickTheme("dark")}>
              <Moon /> {THEME_LABELS.dark}
            </CommandItem>
            <CommandItem value="theme system" onSelect={() => pickTheme("system")}>
              <Monitor /> {THEME_LABELS.system}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
