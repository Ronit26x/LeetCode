import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { problems } from "@/db/schema";
import { getSettings } from "@/db/bootstrap";
import { getTodayQueue } from "@/lib/queue/build";
import { getProblem, listTags, enrichProblems } from "@/lib/problems/queries";
import { Session } from "@/components/review/session";
import { SessionSummary } from "@/components/review/session-summary";
import { CardFront } from "@/components/review/card-front";
import { CardBack } from "@/components/review/card-back";
import type { ProblemFormValues } from "@/components/problems/problem-form";
import { eq } from "drizzle-orm";

export const metadata: Metadata = { title: "Session" };

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ i?: string; problem?: string }>;
}) {
  const { i, problem } = await searchParams;
  const now = new Date();
  const settings = await getSettings();
  const db = await getDb();

  let problemId: string | null = null;
  let index = 0;
  let total = 1;
  let done = 0;
  let single = false;
  let nextHref = "/today";
  let suggestion: { mode: "revise" | "resolve"; reason: string } | null = null;

  if (problem) {
    // "Review now": a single early review. Suspended cards can be reviewed too.
    const row = await db.query.problems.findFirst({
      where: eq(problems.id, problem),
      with: { card: true, problemTags: { with: { tag: true } } },
    });
    if (!row || !row.card) notFound();
    const [item] = await enrichProblems([row], { settings, now });
    suggestion = item.suggestion;
    problemId = row.id;
    single = true;
    nextHref = `/problems/${row.id}`;
  } else {
    const q = await getTodayQueue(now);
    const order = q.orderedIds;
    const due = new Map(q.items.map((it) => [it.id, it]));
    const requested = Math.max(0, Number.parseInt(i ?? "0", 10) || 0);
    let found = -1;
    for (let k = requested; k < order.length; k++)
      if (due.has(order[k])) {
        found = k;
        break;
      }
    if (found === -1)
      for (let k = 0; k < requested && k < order.length; k++)
        if (due.has(order[k])) {
          found = k;
          break;
        }
    total = order.length;
    done = order.filter((id) => !due.has(id)).length;
    if (found === -1) {
      const againTitles = q.stats.doneToday.againIds.length
        ? await db
            .select({ id: problems.id, title: problems.title })
            .from(problems)
            .where(inArray(problems.id, q.stats.doneToday.againIds))
        : [];
      return <SessionSummary stats={q.stats} againTitles={againTitles} />;
    }
    index = found;
    problemId = order[found];
    suggestion = due.get(problemId)?.suggestion ?? null;
    nextHref = `/review?i=${found + 1}`;
  }

  const [p, tags] = await Promise.all([getProblem(problemId, now), listTags()]);
  if (!p) notFound();

  const editInitial: ProblemFormValues = {
    leetcodeNumber: p.leetcodeNumber,
    slug: p.slug,
    title: p.title,
    url: p.url ?? "",
    source: p.source,
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

  return (
    <Session
      key={p.id}
      problemId={p.id}
      index={index}
      total={total}
      done={done}
      title={p.title}
      url={p.url}
      difficulty={p.difficulty}
      suggestion={suggestion}
      allowEasyInRevise={settings.allowEasyInRevise}
      timeTargets={settings.resolveTimeTargetsMin}
      editTags={tags}
      editInitial={editInitial}
      single={single}
      nextHref={nextHref}
      front={
        <CardFront
          data={{
            title: p.title,
            leetcodeNumber: p.leetcodeNumber,
            source: p.source,
            difficulty: p.difficulty,
            url: p.url,
            promptSummary: p.promptSummary,
            tags: p.tags,
          }}
        />
      }
      back={
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
        />
      }
    />
  );
}
