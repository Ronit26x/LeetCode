"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowSquareOut,
  CaretDown,
  CaretRight,
  MagnifyingGlass,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, inputClass, textareaClass } from "@/components/common/field";
import { NativeSelect } from "@/components/common/native-select";
import { TagPicker } from "@/components/problems/tag-picker";
import { ProblemPicker } from "@/components/problems/problem-picker";
import {
  SnippetsEditor,
  newSnippet,
  type SnippetDraft,
} from "@/components/problems/snippets-editor";
import { NotesEditor } from "@/components/notes/notes-editor";
import { RatingButtons, type RatingValue } from "@/components/review/rating-buttons";
import {
  createProblem,
  prefillFromUrl,
  updateProblem,
  type PrefillResult,
} from "@/lib/problems/actions";
import type { ProblemBrief, TagBrief } from "@/lib/problems/queries";
import type { Difficulty, ProblemSource } from "@/db/schema";
import { cn } from "@/lib/utils";

export interface ProblemFormValues {
  leetcodeNumber: number | null;
  slug: string | null;
  title: string;
  url: string;
  source: ProblemSource;
  difficulty: Difficulty;
  promptSummary: string;
  keyInsight: string;
  approach: string;
  timeComplexity: string;
  spaceComplexity: string;
  pitfalls: string;
  notes: string;
  snippets: SnippetDraft[];
  tagIds: string[];
  newTags: string[];
  related: ProblemBrief[];
}

export function emptyValues(): ProblemFormValues {
  return {
    leetcodeNumber: null,
    slug: null,
    title: "",
    url: "",
    source: "leetcode",
    difficulty: "medium",
    promptSummary: "",
    keyInsight: "",
    approach: "",
    timeComplexity: "",
    spaceComplexity: "",
    pitfalls: "",
    notes: "",
    snippets: [newSnippet()],
    tagIds: [],
    newTags: [],
    related: [],
  };
}

function Section({
  title,
  hint,
  children,
  collapsible,
  defaultOpen = true,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="flex items-center gap-1 text-sm font-medium text-foreground"
            >
              {open ? (
                <CaretDown size={14} className="text-fg-subtle" />
              ) : (
                <CaretRight size={14} className="text-fg-subtle" />
              )}
              {title}
            </button>
          ) : (
            <h2 className="text-sm font-medium text-foreground">{title}</h2>
          )}
          {hint ? <p className="mt-0.5 text-2xs text-fg-subtle">{hint}</p> : null}
        </div>
      </div>
      {!collapsible || open ? children : null}
    </section>
  );
}

export function ProblemForm({
  mode,
  tags,
  initial,
  problemId,
  onSaved,
  onCancel,
}: {
  mode: "create" | "edit";
  tags: TagBrief[];
  initial?: ProblemFormValues;
  problemId?: string;
  onSaved?: (id: string) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [v, setV] = React.useState<ProblemFormValues>(() => initial ?? emptyValues());
  const [lookup, setLookup] = React.useState("");
  const [looking, setLooking] = React.useState(false);
  const [prefill, setPrefill] = React.useState<PrefillResult | null>(null);
  const [prefillError, setPrefillError] = React.useState<string | null>(null);
  const [suggested, setSuggested] = React.useState<string[]>([]);
  const [ratingOpen, setRatingOpen] = React.useState(false);
  const [minutes, setMinutes] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const titleRef = React.useRef<HTMLInputElement>(null);

  const set = <K extends keyof ProblemFormValues>(key: K, value: ProblemFormValues[K]) =>
    setV((prev) => ({ ...prev, [key]: value }));

  async function runPrefill() {
    if (!lookup.trim()) return;
    setLooking(true);
    setPrefillError(null);
    const res = await prefillFromUrl(lookup);
    setLooking(false);
    if (!res.ok) {
      setPrefillError(res.error);
      const parsed =
        lookup.match(/problems\/([a-z0-9-]+)/i)?.[1] ??
        (/^[a-z0-9-]+$/i.test(lookup.trim()) ? lookup.trim() : null);
      if (parsed) {
        set("slug", parsed.toLowerCase());
        set("url", `https://leetcode.com/problems/${parsed.toLowerCase()}/`);
      }
      titleRef.current?.focus();
      return;
    }
    const d = res.data;
    setPrefill(d);
    setSuggested(d.suggestedNewTags);
    setV((prev) => ({
      ...prev,
      source: d.source,
      slug: d.slug,
      url: d.url,
      leetcodeNumber: d.number ?? (d.source === "leetcode" ? prev.leetcodeNumber : null),
      title: d.title || prev.title,
      difficulty: d.difficulty ?? prev.difficulty,
      tagIds: [...new Set([...prev.tagIds, ...d.matchedTagIds])],
    }));
    if (!d.prefilled) titleRef.current?.focus();
  }

  function payload() {
    return {
      leetcodeNumber: v.leetcodeNumber,
      slug: v.slug,
      title: v.title,
      url: v.url,
      source: v.source,
      difficulty: v.difficulty,
      promptSummary: v.promptSummary,
      keyInsight: v.keyInsight,
      approach: v.approach,
      timeComplexity: v.timeComplexity,
      spaceComplexity: v.spaceComplexity,
      pitfalls: v.pitfalls,
      notes: v.notes,
      snippets: v.snippets
        .filter((s) => s.code.length > 0)
        .map((s, i) => ({
          id: s.id,
          label: s.label.trim() || "Snippet",
          language: s.language,
          code: s.code,
          sortOrder: i,
        })),
      tagIds: v.tagIds,
      newTags: v.newTags,
      relatedIds: v.related.map((r) => r.id),
    };
  }

  function submitCreate(outcome: { kind: "backlog" } | { kind: "solved"; rating: RatingValue }) {
    setError(null);
    startTransition(async () => {
      const durationSeconds = minutes.trim() ? Math.round(Number(minutes) * 60) : null;
      const res = await createProblem({
        ...payload(),
        outcome:
          outcome.kind === "solved"
            ? {
                kind: "solved",
                rating: outcome.rating,
                durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
                clientReviewId: crypto.randomUUID(),
              }
            : { kind: "backlog" },
      });
      if (!res.ok) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success(
        outcome.kind === "solved" ? "Solved. It is scheduled." : "Added to the backlog.",
      );
      router.push(`/problems/${res.data.id}`);
    });
  }

  function submitEdit() {
    if (!problemId) return;
    setError(null);
    startTransition(async () => {
      const res = await updateProblem({ id: problemId, ...payload() });
      if (!res.ok) {
        setError(res.error);
        toast.error(res.error);
        return;
      }
      toast.success("Saved");
      router.refresh();
      onSaved?.(problemId);
    });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (mode === "edit") submitEdit();
      else if (ratingOpen) submitCreate({ kind: "solved", rating: 3 });
      else submitCreate({ kind: "backlog" });
    }
  }

  const duplicate = mode === "create" && prefill?.existingProblemId && v.slug === prefill.slug;
  const canSubmit = v.title.trim().length > 0 && !pending && !duplicate;

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      onKeyDown={onKeyDown}
      className="flex flex-col gap-5"
      aria-label={mode === "create" ? "Add problem" : "Edit problem"}
    >
      {mode === "create" ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="lookup" className="text-md font-medium">
            Problem URL, or a LeetCode slug
          </label>
          <div className="flex gap-2">
            <input
              id="lookup"
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runPrefill();
                }
              }}
              placeholder="https://leetcode.com/problems/two-sum/"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className={cn(inputClass, "font-mono text-md")}
            />
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={runPrefill}
              disabled={looking || !lookup.trim()}
            >
              <MagnifyingGlass size={16} />
              {looking ? "Looking up" : "Prefill"}
            </Button>
          </div>
          {prefillError ? (
            <p className="text-2xs text-hard" role="alert">
              {prefillError}
            </p>
          ) : prefill ? (
            <p className="text-2xs text-fg-muted">
              Prefilled{" "}
              {prefill.prefilled
                ? `Prefilled ${prefill.number ? `${prefill.number}. ` : ""}${prefill.title}.`
                : prefill.source === "gfg"
                  ? `GeeksforGeeks problem ${prefill.slug}. No prefill for GFG; fill in the title and difficulty.`
                  : "Saved as another source. Fill in the title and difficulty."}
              {prefill.existingProblemId ? (
                <>
                  {" "}
                  Already in your library:{" "}
                  <Link
                    href={`/problems/${prefill.existingProblemId}`}
                    className="text-primary underline underline-offset-2"
                  >
                    open it
                  </Link>
                  .
                </>
              ) : null}
            </p>
          ) : (
            <p className="text-2xs text-fg-subtle">
              LeetCode links are prefilled (number, title, difficulty, topics). GeeksforGeeks links
              set the source and slug; any other link is kept as is. Manual entry always works.
            </p>
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-[6rem_1fr] gap-3 sm:grid-cols-[6rem_1fr_9rem]">
        <Field label={v.source === "leetcode" ? "Number" : "Source"} htmlFor="number">
          {v.source === "leetcode" ? (
            <input
              id="number"
              inputMode="numeric"
              value={v.leetcodeNumber ?? ""}
              onChange={(e) =>
                set(
                  "leetcodeNumber",
                  e.target.value ? Number.parseInt(e.target.value, 10) || null : null,
                )
              }
              className={inputClass}
            />
          ) : (
            <NativeSelect
              id="number"
              value={v.source}
              onChange={(e) => set("source", e.target.value as ProblemSource)}
            >
              <option value="gfg">GFG</option>
              <option value="other">Other</option>
              <option value="leetcode">LeetCode</option>
            </NativeSelect>
          )}
        </Field>
        <Field label="Title" htmlFor="title">
          <input
            id="title"
            ref={titleRef}
            value={v.title}
            onChange={(e) => set("title", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Difficulty" htmlFor="difficulty" className="col-span-2 sm:col-span-1">
          <NativeSelect
            id="difficulty"
            value={v.difficulty}
            onChange={(e) => set("difficulty", e.target.value as Difficulty)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </NativeSelect>
        </Field>
      </div>
      <Field
        label="Link"
        htmlFor="url"
        right={
          v.url ? (
            <a
              href={v.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-2xs text-fg-muted hover:text-foreground"
            >
              Open <ArrowSquareOut size={12} />
            </a>
          ) : null
        }
      >
        <input
          id="url"
          value={v.url}
          onChange={(e) => set("url", e.target.value)}
          placeholder="https://…"
          className={cn(inputClass, "font-mono text-md")}
          spellCheck={false}
        />
      </Field>

      <Section
        title="Card front"
        hint="Your own restatement of the problem, one to three lines. This is all you see before you flip."
      >
        <Field label="Prompt summary" htmlFor="promptSummary">
          <textarea
            id="promptSummary"
            rows={3}
            value={v.promptSummary}
            onChange={(e) => set("promptSummary", e.target.value)}
            className={textareaClass}
            placeholder="Given an array and a target, return indices of the two numbers that add up to it."
          />
        </Field>
      </Section>

      <Section title="Card back" hint="The insight comes first and biggest. The rest supports it.">
        <Field
          label="Key insight"
          htmlFor="keyInsight"
          hint="One or two lines. The thing you must recall."
        >
          <textarea
            id="keyInsight"
            rows={2}
            value={v.keyInsight}
            onChange={(e) => set("keyInsight", e.target.value)}
            className={cn(textareaClass, "display-italic text-lg leading-7")}
            placeholder="Store each number's complement in a hash map as you go."
          />
        </Field>
        <Field label="Approach" htmlFor="approach" hint="Numbered steps. Markdown.">
          <textarea
            id="approach"
            rows={5}
            value={v.approach}
            onChange={(e) => set("approach", e.target.value)}
            className={cn(textareaClass, "font-mono text-md leading-5")}
            style={{ tabSize: 4 }}
            placeholder={
              "1. Walk the array once.\n2. For each x, check if target - x is in the map.\n3. Otherwise store x -> index."
            }
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Time" htmlFor="time">
            <input
              id="time"
              value={v.timeComplexity}
              onChange={(e) => set("timeComplexity", e.target.value)}
              placeholder="O(n)"
              className={cn(inputClass, "font-mono text-md")}
            />
          </Field>
          <Field label="Space" htmlFor="space">
            <input
              id="space"
              value={v.spaceComplexity}
              onChange={(e) => set("spaceComplexity", e.target.value)}
              placeholder="O(n)"
              className={cn(inputClass, "font-mono text-md")}
            />
          </Field>
        </div>
        <Field
          label="Pitfalls"
          htmlFor="pitfalls"
          hint="Edge cases and the bugs you hit. Markdown."
        >
          <textarea
            id="pitfalls"
            rows={3}
            value={v.pitfalls}
            onChange={(e) => set("pitfalls", e.target.value)}
            className={cn(textareaClass, "font-mono text-md leading-5")}
            style={{ tabSize: 4 }}
            placeholder={"- Same element twice\n- Negative numbers"}
          />
        </Field>
      </Section>

      <Section title="Code" hint="Stored exactly as pasted. Tabs stay tabs.">
        <SnippetsEditor value={v.snippets} onChange={(s) => set("snippets", s)} />
      </Section>

      <Section
        title="Tags"
        hint="Topics drive interleaving; the first topic tag is the primary one."
      >
        <TagPicker
          tags={tags}
          value={v.tagIds}
          newTags={v.newTags}
          onChange={(ids, n) => setV((p) => ({ ...p, tagIds: ids, newTags: n }))}
          suggested={suggested}
        />
      </Section>

      <Section title="Similar problems">
        <ProblemPicker
          value={v.related}
          onChange={(r) => set("related", r)}
          excludeId={problemId}
        />
      </Section>

      <Section
        title="Extended notes"
        hint="Long-form. Markdown with fenced code."
        collapsible
        defaultOpen={mode === "edit" ? !!initial?.notes : false}
      >
        <NotesEditor
          id="notes"
          value={v.notes}
          onChange={(n) => set("notes", n)}
          placeholder="Anything else worth keeping: variants, follow-ups, what the interviewer might ask."
        />
      </Section>

      {error ? (
        <p role="alert" className="rounded-md border border-again/30 bg-again/8 px-3 py-2 text-md">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-[2px] lg:bottom-0 lg:mx-0 lg:px-0">
        {mode === "edit" ? (
          <div className="flex items-center justify-end gap-2">
            {onCancel ? (
              <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
                Cancel
              </Button>
            ) : null}
            <Button type="button" size="lg" onClick={submitEdit} disabled={!canSubmit}>
              {pending ? "Saving" : "Save changes"}
            </Button>
            <span className="hidden text-2xs text-fg-subtle sm:inline">⌘↵</span>
          </div>
        ) : ratingOpen ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium">How did the solve go?</p>
              <label className="flex items-center gap-2 text-2xs text-fg-muted">
                Minutes
                <input
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  inputMode="numeric"
                  className={cn(inputClass, "h-7 w-16 text-md")}
                  placeholder="30"
                />
              </label>
            </div>
            <RatingButtons
              mode="first"
              showRubric
              onRate={(r) => submitCreate({ kind: "solved", rating: r })}
              disabled={!canSubmit}
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setRatingOpen(false)}
                className="text-2xs text-fg-muted hover:text-foreground"
              >
                Back
              </button>
              <span className="text-2xs text-fg-subtle">
                Picking a grade saves and schedules the first review.
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => submitCreate({ kind: "backlog" })}
              disabled={!canSubmit}
            >
              {pending ? "Saving" : "Add to backlog"}
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={() => setRatingOpen(true)}
              disabled={!canSubmit}
            >
              Solved it today
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
