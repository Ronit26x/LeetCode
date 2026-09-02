import type { Metadata } from "next";
import Link from "next/link";
import { Tray } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { CoverageStrip } from "@/components/backlog/coverage-strip";
import { BacklogToolbar } from "@/components/backlog/backlog-toolbar";
import { BacklogList } from "@/components/backlog/backlog-list";
import { backlogCoverage, listProblems, listTags } from "@/lib/problems/queries";
import { orderBacklog, type BacklogSort } from "@/lib/backlog";
import { getSettings } from "@/db/bootstrap";
import { pluralize } from "@/lib/format";

export const metadata: Metadata = { title: "Backlog" };

const SORTS: BacklogSort[] = ["stalest", "recent", "difficulty", "title"];

export default async function BacklogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const tier = get("tier");
  const source = get("source");
  const difficulty = get("difficulty");
  const sort = (
    SORTS.includes(get("sort") as BacklogSort) ? get("sort") : "stalest"
  ) as BacklogSort;
  const now = new Date();
  const [items, tags, coverage, settings] = await Promise.all([
    listProblems(
      {
        status: "backlog",
        tagId: get("tag"),
        tier: tier === "core" || tier === "warmup" || tier === "skip" ? tier : undefined,
        source:
          source === "gfg" || source === "leetcode" || source === "other" ? source : undefined,
        difficulty:
          difficulty === "easy" || difficulty === "medium" || difficulty === "hard"
            ? difficulty
            : undefined,
        recentDays: get("recent") === "14" ? 14 : undefined,
      },
      now,
    ),
    listTags(),
    backlogCoverage(),
    getSettings(),
  ]);
  const ordered = orderBacklog(items, sort);
  const filtered = ["tier", "tag", "difficulty", "source", "recent"].some((k) => get(k));
  const nothingAtAll = items.length === 0 && !filtered && coverage.length === 0;

  return (
    <>
      <PageHeader
        title="Backlog"
        description={`${pluralize(items.length, "problem")} to re-solve or re-enter. Core before warmup, stalest first.`}
        actions={<Button render={<Link href="/problems/new" />}>Add problem</Button>}
      />
      {nothingAtAll ? (
        <EmptyState
          icon={<Tray size={28} />}
          title="The backlog is empty"
          body="Paste a LeetCode or GeeksforGeeks URL to queue a problem. Solve it, mark it solved, and it moves into the review schedule."
          actions={<Button render={<Link href="/problems/new" />}>Add problem</Button>}
        />
      ) : (
        <>
          <CoverageStrip rows={coverage} />
          <BacklogToolbar tags={tags} shown={ordered.length} />
          {ordered.length === 0 ? (
            <p className="rounded-md border border-border px-4 py-8 text-center text-sm text-fg-muted">
              {filtered
                ? "Nothing matches these filters."
                : "Nothing queued. Everything you added is scheduled."}
            </p>
          ) : (
            <BacklogList
              items={ordered}
              tags={tags}
              tz={settings.timezone}
              now={now}
              allowEasyInRevise={settings.allowEasyInRevise}
            />
          )}
        </>
      )}
    </>
  );
}
