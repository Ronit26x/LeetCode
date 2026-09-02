import type { Metadata } from "next";
import Link from "next/link";
import { ArrowSquareOut, Tray } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { DifficultyBadge, TagBadge } from "@/components/common/badges";
import { MarkSolvedDialog } from "@/components/problems/mark-solved-dialog";
import { listProblems, listTagsWithCounts } from "@/lib/problems/queries";
import { getSettings } from "@/db/bootstrap";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Backlog" };

export default async function BacklogPage() {
  const [items, tags, settings] = await Promise.all([
    listProblems({ status: "backlog", sort: "created", dir: "desc" }),
    listTagsWithCounts(),
    getSettings(),
  ]);
  const topics = tags.filter((t) => t.kind === "topic");
  const gaps = topics.filter((t) => t.total === 0).length;

  return (
    <>
      <PageHeader
        title="Backlog"
        description="Problems you intend to solve. Nothing here is scheduled yet."
        actions={<Button render={<Link href="/problems/new" />}>Add problem</Button>}
      />
      {items.length === 0 && tags.every((t) => t.total === 0) ? (
        <EmptyState
          icon={<Tray size={28} />}
          title="The backlog is empty"
          body="Paste a LeetCode URL to queue a problem. Solve it, mark it solved, and it moves into the review schedule."
          actions={<Button render={<Link href="/problems/new" />}>Add problem</Button>}
        />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            {items.length === 0 ? (
              <p className="rounded-md border border-border px-4 py-8 text-center text-sm text-fg-muted">Nothing queued. Everything you added is scheduled.</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {items.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        {p.leetcodeNumber ? <span className="text-2xs text-fg-subtle">{p.leetcodeNumber}</span> : null}
                        <Link href={`/problems/${p.id}`} className="truncate text-sm font-medium hover:underline underline-offset-2">
                          {p.title}
                        </Link>
                        <DifficultyBadge difficulty={p.difficulty} plain />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-2xs text-fg-subtle">
                        {p.tags.map((t) => (
                          <TagBadge key={t.id} name={t.name} color={t.color} />
                        ))}
                        <span>added {formatDate(p.createdAt, settings.timezone)}</span>
                      </div>
                    </div>
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noreferrer" aria-label="Open on LeetCode" className="hidden text-fg-muted hover:text-foreground sm:inline-flex">
                        <ArrowSquareOut size={16} />
                      </a>
                    ) : null}
                    <MarkSolvedDialog id={p.id} title={p.title} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <aside className="rounded-xl border border-border bg-surface px-4 py-3">
            <h2 className="text-md font-medium">Coverage</h2>
            <p className="mt-0.5 text-2xs text-fg-subtle">
              {gaps === 0 ? "Every topic has at least one problem." : `${gaps} ${gaps === 1 ? "topic has" : "topics have"} nothing yet.`}
            </p>
            <ul className="mt-2 divide-y divide-border">
              {topics.map((t) => (
                <li key={t.id} className="flex items-center gap-2 py-1.5 text-md">
                  <span className={cn("size-2 shrink-0 rounded-full", `bg-tag-${t.color}`)} aria-hidden />
                  <Link href={`/problems?tag=${t.id}`} className={cn("flex-1 truncate", t.total === 0 ? "text-fg-subtle" : "text-foreground")}>
                    {t.name}
                  </Link>
                  <span className="text-2xs text-fg-muted" title="Active">
                    {t.active}
                  </span>
                  <span className="w-6 text-right text-2xs text-fg-subtle" title="In backlog">
                    {t.backlog ? `+${t.backlog}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}
    </>
  );
}
