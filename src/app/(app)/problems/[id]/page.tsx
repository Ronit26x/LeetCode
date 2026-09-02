import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { getProblem, listTags } from "@/lib/problems/queries";
import { getSettings } from "@/db/bootstrap";
import { ProblemDetailShell } from "@/components/problems/problem-detail-shell";
import { CardFront } from "@/components/review/card-front";
import { CardBack } from "@/components/review/card-back";
import {
  DifficultyBadge,
  MemoryBadge,
  ModeBadge,
  StatusBadge,
  TagBadge,
} from "@/components/common/badges";
import { MemoryPanel } from "@/components/problems/memory-panel";
import { ReviewHistory } from "@/components/problems/review-history";
import type { ProblemFormValues } from "@/components/problems/problem-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await getProblem(id);
  return { title: p ? `${p.leetcodeNumber ? `${p.leetcodeNumber}. ` : ""}${p.title}` : "Problem" };
}

export default async function ProblemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, tags, settings] = await Promise.all([getProblem(id), listTags(), getSettings()]);
  if (!p) notFound();

  const initial: ProblemFormValues = {
    leetcodeNumber: p.leetcodeNumber,
    slug: p.slug,
    title: p.title,
    url: p.url ?? "",
    difficulty: p.difficulty,
    promptSummary: p.promptSummary,
    keyInsight: p.keyInsight,
    approach: p.approach,
    timeComplexity: p.timeComplexity,
    spaceComplexity: p.spaceComplexity,
    pitfalls: p.pitfalls,
    notes: p.notes,
    snippets: p.snippets.map((s) => ({
      id: s.id,
      label: s.label,
      language: s.language,
      code: s.code,
    })),
    tagIds: p.tags.map((t) => t.id),
    newTags: [],
    related: p.related,
  };

  const header = (
    <>
      <div className="flex flex-wrap items-center gap-2 text-2xs text-fg-muted">
        {p.leetcodeNumber ? <span>{p.leetcodeNumber}</span> : null}
        <DifficultyBadge difficulty={p.difficulty} plain />
        <StatusBadge status={p.status} />
        {p.status === "active" ? <MemoryBadge state={p.computed.memoryState} /> : null}
        {p.computed.suggestion ? <ModeBadge mode={p.computed.suggestion.mode} /> : null}
        {p.url ? (
          <a
            href={p.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            LeetCode <ArrowSquareOut size={12} />
          </a>
        ) : null}
      </div>
      <h1 className="mt-1 display text-2xl leading-8 sm:text-3xl sm:leading-10">{p.title}</h1>
      {p.tags.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {p.tags.map((t) => (
            <TagBadge key={t.id} name={t.name} color={t.color} />
          ))}
        </div>
      ) : null}
    </>
  );

  return (
    <ProblemDetailShell
      id={p.id}
      status={p.status}
      hasCard={!!p.card}
      tags={tags}
      initial={initial}
      header={header}
      aside={
        <div className="flex flex-col gap-6">
          <MemoryPanel
            card={p.card}
            computed={p.computed}
            reviseCount={p.reviseCount}
            resolveCount={p.resolveCount}
            status={p.status}
            tz={settings.timezone}
            interviewDate={settings.interviewDate}
          />
          <ReviewHistory logs={p.logs} tz={settings.timezone} />
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
          <p className="mb-3 text-2xs font-medium text-fg-subtle">Front</p>
          <CardFront
            data={{
              title: p.title,
              leetcodeNumber: p.leetcodeNumber,
              difficulty: p.difficulty,
              url: p.url,
              promptSummary: p.promptSummary,
              tags: p.tags,
            }}
            compact
          />
        </section>
        <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
          <p className="mb-3 text-2xs font-medium text-fg-subtle">Back</p>
          <CardBack
            data={{
              keyInsight: p.keyInsight,
              approach: p.approach,
              timeComplexity: p.timeComplexity,
              spaceComplexity: p.spaceComplexity,
              pitfalls: p.pitfalls,
              notes: p.notes,
              snippets: p.snippets,
              related: p.related,
            }}
            openNotes
            openCode
          />
        </section>
      </div>
    </ProblemDetailShell>
  );
}
