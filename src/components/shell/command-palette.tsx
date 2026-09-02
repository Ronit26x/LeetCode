"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Monitor, Moon, Plus, Sun, SunDim, Cards } from "@phosphor-icons/react/dist/ssr";
import {
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

const OPEN_EVENT = "recur:command-palette";

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export interface PaletteProblem {
  id: string;
  title: string;
  number: number | null;
}

export function CommandPalette({
  searchProblems,
}: {
  /** Optional async problem search, wired in once the library exists. */
  searchProblems?: (q: string) => Promise<PaletteProblem[]>;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [problems, setProblems] = React.useState<PaletteProblem[]>([]);
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
    if (!searchProblems || query.trim().length < 2) return;
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
  }, [query, searchProblems]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function pickTheme(t: ThemeChoice) {
    setTheme(t);
    setOpen(false);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Commands"
      description="Jump to a page or a problem, add a problem, or change the theme."
    >
      <CommandInput
        placeholder="Jump to a problem, page, or action"
        value={query}
        onValueChange={onQueryChange}
      />
      <CommandList>
        <CommandEmpty>Nothing matches.</CommandEmpty>
        {problems.length > 0 ? (
          <CommandGroup heading="Problems">
            {problems.map((p) => (
              <CommandItem key={p.id} value={`problem ${p.number ?? ""} ${p.title}`} onSelect={() => go(`/problems/${p.id}`)}>
                {p.number ? <span className="w-10 text-right text-fg-subtle">{p.number}</span> : null}
                <span className="truncate">{p.title}</span>
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
              <CommandItem key={item.key} value={`go ${item.label}`} onSelect={() => go(item.href)}>
                <IconComp />
                {item.label}
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
    </CommandDialog>
  );
}
