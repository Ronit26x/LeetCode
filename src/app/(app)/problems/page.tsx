import type { Metadata } from "next";
import Link from "next/link";
import { Stack } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { ProblemsToolbar } from "@/components/problems/problems-toolbar";
import { ProblemsTable } from "@/components/problems/problems-table";
import {
  countByStatus,
  listProblems,
  listTags,
  type ListFilters,
  type SortKey,
} from "@/lib/problems/queries";
import { getSettings } from "@/db/bootstrap";

export const metadata: Metadata = { title: "Problems" };

const SORTS: SortKey[] = [
  "due",
  "stability",
  "retrievability",
  "difficulty",
  "lastReviewed",
  "revises",
  "resolves",
  "title",
  "number",
  "created",
];

function parseFilters(sp: Record<string, string | string[] | undefined>): ListFilters {
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const difficulty = get("difficulty");
  const memory = get("memory");
  const status = get("status");
  const sort = get("sort");
  return {
    q: get("q"),
    tagId: get("tag"),
    difficulty:
      difficulty === "easy" || difficulty === "medium" || difficulty === "hard"
        ? difficulty
        : undefined,
    memory: memory === "new" || memory === "review" || memory === "lapsed" ? memory : undefined,
    status:
      status === "backlog" || status === "active" || status === "suspended" || status === "archived"
        ? status
        : "all",
    sort: SORTS.includes(sort as SortKey) ? (sort as SortKey) : "due",
    dir: get("dir") === "desc" ? "desc" : "asc",
  };
}

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const [items, tags, counts, settings] = await Promise.all([
    listProblems(filters),
    listTags(),
    countByStatus(),
    getSettings(),
  ]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <>
      <PageHeader
        title="Problems"
        description="Everything you have added, with its memory state."
        actions={<Button render={<Link href="/problems/new" />}>Add problem</Button>}
      />
      {total === 0 ? (
        <EmptyState
          icon={<Stack size={28} />}
          title="No problems yet"
          body="Your library fills as you add solved problems. Search, filter by tag and memory state, and edit anything inline."
          actions={<Button render={<Link href="/problems/new" />}>Add problem</Button>}
        />
      ) : (
        <>
          <ProblemsToolbar tags={tags} total={items.length} statusCounts={counts} />
          {items.length === 0 ? (
            <p className="rounded-md border border-border px-4 py-8 text-center text-sm text-fg-muted">
              Nothing matches these filters.
            </p>
          ) : (
            <ProblemsTable items={items} tags={tags} tz={settings.timezone} />
          )}
        </>
      )}
    </>
  );
}
