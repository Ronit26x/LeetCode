"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Archive,
  ArrowCounterClockwise,
  PauseCircle,
  Play,
  Tag,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DifficultyBadge,
  MemoryBadge,
  ModeBadge,
  SourceBadge,
  TagBadge,
} from "@/components/common/badges";
import { formatDate, formatDueRelative, formatPercent, formatStability } from "@/lib/format";
import {
  addTagsToProblems,
  archiveProblems,
  resetCards,
  suspendProblems,
  unsuspendProblems,
} from "@/lib/problems/actions";
import type { ProblemListItem, TagBrief } from "@/lib/problems/queries";
import { cn } from "@/lib/utils";

export function ProblemsTable({
  items,
  tags,
  tz,
}: {
  items: ProblemListItem[];
  tags: TagBrief[];
  tz: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const ids = [...selected];
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  }
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function run(label: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? "Something went wrong.");
        return;
      }
      toast.success(label);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {ids.length > 0 ? (
        <div className="sticky top-12 z-20 flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 shadow-float">
          <span className="text-md font-medium">{ids.length} selected</span>
          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm" disabled={pending} />}>
              <Tag size={14} />
              Add tag
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-72 w-56 overflow-y-auto p-1">
              {tags.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => run("Tag added", () => addTagsToProblems(ids, [t.id]))}
                  className="flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-md hover:bg-hover"
                >
                  <span className={cn("size-2 rounded-full", `bg-tag-${t.color}`)} aria-hidden />
                  {t.name}
                </button>
              ))}
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run("Suspended", () => suspendProblems(ids))}
          >
            <PauseCircle size={14} />
            Suspend
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run("Unsuspended", () => unsuspendProblems(ids))}
          >
            <Play size={14} />
            Unsuspend
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run("Archived", () => archiveProblems(ids))}
          >
            <Archive size={14} />
            Archive
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setConfirmReset(true)}
          >
            <ArrowCounterClockwise size={14} />
            Reset card
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setSelected(new Set())}
          >
            <X size={14} />
            Clear
          </Button>
        </div>
      ) : null}

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Reset {ids.length === 1 ? "this card" : `${ids.length} cards`}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Memory state goes back to new and the card becomes due now. The review history stays;
              counters are untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmReset(false);
                run("Reset", () => resetCards(ids));
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Desktop: dense table */}
      <div className="hidden overflow-x-auto rounded-md border border-border md:block">
        <table className="w-full text-md">
          <thead>
            <tr className="h-9 border-b border-border text-left text-2xs font-medium text-fg-muted">
              <th className="w-9 pl-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <th className="w-14 pr-2 text-right">#</th>
              <th className="min-w-56 pr-3">Title</th>
              <th className="w-20">Difficulty</th>
              <th className="min-w-40">Tags</th>
              <th className="w-20">State</th>
              <th className="w-24">Due</th>
              <th className="w-16 text-right">S</th>
              <th className="w-14 text-right">R</th>
              <th className="w-24 text-right" title="Revised / Resolved">
                Rev / Res
              </th>
              <th className="w-24 pr-3 text-right">Last</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr
                key={p.id}
                className={cn(
                  "h-10 border-b border-border last:border-b-0 hover:bg-hover/60",
                  selected.has(p.id) && "bg-primary/6",
                )}
              >
                <td className="pl-3">
                  <Checkbox
                    checked={selected.has(p.id)}
                    onCheckedChange={() => toggle(p.id)}
                    aria-label={`Select ${p.title}`}
                  />
                </td>
                <td className="pr-2 text-right text-fg-subtle">{p.leetcodeNumber ?? ""}</td>
                <td className="max-w-0 pr-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <Link
                      href={`/problems/${p.id}`}
                      className="block truncate font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {p.title}
                    </Link>
                    <SourceBadge source={p.source} />
                  </span>
                </td>
                <td>
                  <DifficultyBadge difficulty={p.difficulty} plain />
                </td>
                <td>
                  <div className="flex items-center gap-1 overflow-hidden">
                    {p.tags.slice(0, 3).map((t) => (
                      <TagBadge key={t.id} name={t.name} color={t.color} />
                    ))}
                    {p.tags.length > 3 ? (
                      <span className="text-2xs text-fg-subtle">+{p.tags.length - 3}</span>
                    ) : null}
                  </div>
                </td>
                <td>
                  {p.status === "active" ? (
                    <MemoryBadge state={p.memoryState} />
                  ) : (
                    <span className="text-2xs text-fg-subtle capitalize">{p.status}</span>
                  )}
                </td>
                <td
                  className={cn(
                    "text-fg-muted",
                    p.dueInDays !== null && p.dueInDays < 0 && "text-hard",
                  )}
                >
                  {p.card && p.status === "active" ? formatDueRelative(p.dueInDays ?? 0) : ""}
                </td>
                <td className="text-right text-fg-muted">
                  {p.card ? formatStability(p.card.stability) : ""}
                </td>
                <td className="text-right text-fg-muted">
                  {p.retrievability !== null ? formatPercent(p.retrievability) : ""}
                </td>
                <td className="text-right text-fg-muted">
                  {p.reviseCount} / {p.resolveCount}
                </td>
                <td className="pr-3 text-right text-fg-muted">
                  {p.card?.lastReview ? formatDate(p.card.lastReview, tz) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone: cards */}
      <ul className="flex flex-col gap-2 md:hidden">
        {items.map((p) => (
          <li
            key={p.id}
            className={cn(
              "rounded-md border border-border bg-surface",
              selected.has(p.id) && "border-primary/50",
            )}
          >
            <div className="flex items-start gap-3 p-3">
              <Checkbox
                checked={selected.has(p.id)}
                onCheckedChange={() => toggle(p.id)}
                aria-label={`Select ${p.title}`}
                className="mt-1"
              />
              <Link href={`/problems/${p.id}`} className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  {p.leetcodeNumber ? (
                    <span className="text-2xs text-fg-subtle">{p.leetcodeNumber}</span>
                  ) : null}
                  <span className="truncate text-sm font-medium">{p.title}</span>
                  <SourceBadge source={p.source} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <DifficultyBadge difficulty={p.difficulty} plain />
                  {p.status === "active" ? <MemoryBadge state={p.memoryState} /> : null}
                  {p.suggestion ? <ModeBadge mode={p.suggestion.mode} /> : null}
                  {p.tags.slice(0, 2).map((t) => (
                    <TagBadge key={t.id} name={t.name} color={t.color} />
                  ))}
                </div>
                <div className="mt-1.5 flex gap-3 text-2xs text-fg-muted">
                  {p.card && p.status === "active" ? (
                    <span className={cn(p.dueInDays !== null && p.dueInDays < 0 && "text-hard")}>
                      {formatDueRelative(p.dueInDays ?? 0)}
                    </span>
                  ) : null}
                  {p.retrievability !== null ? (
                    <span>R {formatPercent(p.retrievability)}</span>
                  ) : null}
                  <span>
                    {p.reviseCount} rev · {p.resolveCount} res
                  </span>
                </div>
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
