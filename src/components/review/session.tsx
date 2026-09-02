"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUUpLeft, Question, X } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SegmentedControl } from "@/components/common/segmented-control";
import { FlipCard } from "@/components/review/flip-card";
import { ResolveTimer } from "@/components/review/timer";
import { HelpSheet } from "@/components/review/help-sheet";
import { RatingButtons, RATING_NAMES, type RatingValue } from "@/components/review/rating-buttons";
import { ProblemForm, type ProblemFormValues } from "@/components/problems/problem-form";
import { annotateGrade, gradeCard, previewGrades, undoGrade } from "@/lib/review/actions";
import type { GradePreview } from "@/lib/review/core";
import type { TagBrief } from "@/lib/problems/queries";
import type { Difficulty, ResolveTimeTargets, ReviewMode } from "@/db/schema";
import { formatInterval, MODE_LABEL } from "@/lib/format";
import { isInteractiveTarget, isTypingTarget } from "@/lib/hotkeys";
import { inputClass } from "@/components/common/field";
import { cn } from "@/lib/utils";

const LAST_GRADE_KEY = "recur-last-grade";

interface LastGrade {
  logId: string;
  index: number;
  problemId: string;
  single: boolean;
  at: number;
}

function readLastGrade(): LastGrade | null {
  try {
    const raw = sessionStorage.getItem(LAST_GRADE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as LastGrade;
    // Only the most recent grade in this sitting can be undone.
    if (Date.now() - v.at > 6 * 60 * 60_000) return null;
    return v;
  } catch {
    return null;
  }
}

export interface SessionProps {
  problemId: string;
  index: number;
  total: number;
  done: number;
  title: string;
  url: string | null;
  difficulty: Difficulty;
  suggestion: { mode: ReviewMode; reason: string } | null;
  front: React.ReactNode;
  back: React.ReactNode;
  allowEasyInRevise: boolean;
  timeTargets: ResolveTimeTargets;
  editTags: TagBrief[];
  editInitial: ProblemFormValues;
  single: boolean;
  nextHref: string;
}

export function Session(props: SessionProps) {
  const router = useRouter();
  const [flipped, setFlipped] = React.useState(false);
  const [mode, setMode] = React.useState<ReviewMode>(props.suggestion?.mode ?? "revise");
  const [flipAt, setFlipAt] = React.useState<string | null>(null);
  const [previews, setPreviews] = React.useState<GradePreview | null>(null);
  const [grading, setGrading] = React.useState(false);
  const [notePrompt, setNotePrompt] = React.useState<{ logId: string; rating: RatingValue } | null>(
    null,
  );
  const [note, setNote] = React.useState("");
  const [appendPitfalls, setAppendPitfalls] = React.useState(true);
  const [editOpen, setEditOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState("");
  const [lastGrade, setLastGrade] = React.useState<LastGrade | null>(null);
  const gradeRef = React.useRef<HTMLDivElement>(null);
  const timerControlsRef = React.useRef<{ elapsed: () => number; pause: () => void }>({
    elapsed: () => 0,
    pause: () => {},
  });

  React.useEffect(() => {
    const t = setTimeout(() => setLastGrade(readLastGrade()), 0);
    return () => clearTimeout(t);
  }, [props.problemId]);

  /** Space and the card toggle both ways; the first flip captures the instant used for previews and the grade. */
  const flip = React.useCallback(() => {
    if (flipped) {
      setFlipped(false);
      return;
    }
    setFlipped(true);
    timerControlsRef.current.pause();
    if (!flipAt) {
      const now = new Date().toISOString();
      setFlipAt(now);
      previewGrades({ problemId: props.problemId, now }).then((res) => {
        if (res.ok) setPreviews(res.data);
        else toast.error(res.error);
      });
    }
    requestAnimationFrame(() => gradeRef.current?.focus({ preventScroll: true }));
  }, [flipped, flipAt, props.problemId]);

  const advance = React.useCallback(() => {
    router.replace(props.nextHref);
  }, [router, props.nextHref]);

  const grade = React.useCallback(
    async (rating: RatingValue) => {
      if (!flipped || grading || !flipAt) return;
      setGrading(true);
      const elapsed = mode === "resolve" ? timerControlsRef.current.elapsed() : 0;
      const res = await gradeCard({
        problemId: props.problemId,
        clientReviewId: crypto.randomUUID(),
        rating,
        mode,
        durationSeconds: elapsed > 0 ? elapsed : null,
        note: null,
        appendNoteToPitfalls: false,
        now: flipAt,
      });
      setGrading(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const last: LastGrade = {
        logId: res.data.logId,
        index: props.index,
        problemId: props.problemId,
        single: props.single,
        at: Date.now(),
      };
      try {
        sessionStorage.setItem(LAST_GRADE_KEY, JSON.stringify(last));
      } catch {}
      setAnnouncement(
        `${RATING_NAMES[rating]}. Next in ${formatInterval(res.data.scheduledDays)}.`,
      );
      if (rating <= 2) {
        setNotePrompt({ logId: res.data.logId, rating });
        return;
      }
      advance();
    },
    [flipped, grading, flipAt, mode, props.problemId, props.index, props.single, advance],
  );

  const undo = React.useCallback(async () => {
    const last = lastGrade ?? readLastGrade();
    if (!last) {
      toast("Nothing to undo.");
      return;
    }
    const res = await undoGrade({ logId: last.logId });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    try {
      sessionStorage.removeItem(LAST_GRADE_KEY);
    } catch {}
    setLastGrade(null);
    toast.success("Undone");
    router.replace(last.single ? `/review?problem=${last.problemId}` : `/review?i=${last.index}`);
  }, [lastGrade, router]);

  async function saveNote(skip: boolean) {
    if (!notePrompt) return;
    if (!skip && note.trim()) {
      const res = await annotateGrade({
        logId: notePrompt.logId,
        note: note.trim(),
        appendToPitfalls: appendPitfalls,
      });
      if (!res.ok) toast.error(res.error);
    }
    setNotePrompt(null);
    setNote("");
    advance();
  }

  function toggleSection(section: "notes" | "code") {
    if (!flipped) flip();
    const el = document.querySelector<HTMLDetailsElement>(`details[data-section="${section}"]`);
    if (el) el.open = !el.open;
  }

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (editOpen || helpOpen) return;
      if (isTypingTarget(e.target)) return;
      switch (e.key) {
        case " ":
          if (!isInteractiveTarget(e.target) && !notePrompt) {
            e.preventDefault();
            flip();
          }
          break;
        case "r":
        case "R":
          e.preventDefault();
          setMode((m) => (m === "revise" ? "resolve" : "revise"));
          break;
        case "n":
        case "N":
          e.preventDefault();
          toggleSection("notes");
          break;
        case "c":
        case "C":
          e.preventDefault();
          toggleSection("code");
          break;
        case "o":
        case "O":
          if (props.url) {
            e.preventDefault();
            window.open(props.url, "_blank", "noopener");
          }
          break;
        case "z":
        case "Z":
          e.preventDefault();
          void undo();
          break;
        case "e":
        case "E":
          e.preventDefault();
          setEditOpen(true);
          break;
        case "?":
          e.preventDefault();
          setHelpOpen(true);
          break;
        case "Escape":
          e.preventDefault();
          router.push("/today");
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, editOpen, helpOpen, notePrompt, flip, undo, props.url, router]);

  const previewLabels = previews
    ? {
        1: formatInterval(previews[1]),
        2: formatInterval(previews[2]),
        3: formatInterval(previews[3]),
        4: formatInterval(previews[4]),
      }
    : undefined;
  const target = props.timeTargets[props.difficulty];
  const presets = [
    ...new Set([props.timeTargets.easy, props.timeTargets.medium, props.timeTargets.hard]),
  ].sort((a, b) => a - b);
  const progress = props.total ? (props.done / props.total) * 100 : 0;

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="mb-3 flex items-center gap-3">
        <span className="text-2xs text-fg-muted">
          {props.single ? "Early review" : `${props.done + 1} of ${props.total}`}
        </span>
        <SegmentedControl<ReviewMode>
          aria-label="Review mode"
          size="sm"
          value={mode}
          onValueChange={setMode}
          options={[
            {
              value: "revise",
              label: "Revise",
              hint: "Recall the insight and approach. About 3 minutes.",
            },
            { value: "resolve", label: "Resolve", hint: "Re-implement it cold, on the clock." },
          ]}
          className="ml-1"
        />
        <div className="ml-auto flex items-center gap-1">
          {lastGrade ? (
            <Button variant="ghost" size="sm" onClick={undo} aria-label="Undo the last grade">
              <ArrowUUpLeft size={14} />
              Undo
              <kbd
                aria-hidden="true"
                className="hidden rounded-[3px] border border-border px-1 font-sans text-2xs text-fg-subtle sm:inline"
              >
                Z
              </kbd>
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setHelpOpen(true)}
            aria-label="Keyboard shortcuts and rubric"
          >
            <Question size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/today")}
            aria-label="Leave the session"
          >
            <X size={16} />
          </Button>
        </div>
      </div>
      <div className="relative mb-4 h-px w-full bg-border" aria-hidden>
        <div
          className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {props.suggestion ? (
        <p className="mb-3 text-2xs text-fg-muted">
          Suggested:{" "}
          <span className="font-medium text-foreground">{MODE_LABEL[props.suggestion.mode]}</span>,{" "}
          {props.suggestion.reason.toLowerCase()}
          {mode !== props.suggestion.mode ? (
            <span className="text-fg-subtle"> · you switched to {MODE_LABEL[mode]}</span>
          ) : null}
        </p>
      ) : null}

      {mode === "resolve" ? (
        <div className="mb-3 flex flex-col gap-2">
          <ResolveTimer presets={presets} initialMinutes={target} controlsRef={timerControlsRef} />
          {!flipped ? (
            <details className="group rounded-md border border-border">
              <summary className="flex h-8 cursor-pointer list-none items-center gap-2 px-3 text-2xs font-medium text-fg-muted select-none [&::-webkit-details-marker]:hidden">
                If stuck
              </summary>
              <ol className="list-decimal border-t border-border py-2 pr-3 pl-8 text-md text-fg-muted">
                <li>Restate the problem in one sentence.</li>
                <li>Walk a small example by hand.</li>
                <li>State the brute force out loud.</li>
                <li>Ask what the brute force wastes. That is the optimization.</li>
              </ol>
            </details>
          ) : null}
        </div>
      ) : null}

      <div key={props.problemId} className="animate-in duration-200 fade-in slide-in-from-right-4">
        <FlipCard flipped={flipped} front={props.front} back={props.back} onFlip={flip} />
      </div>

      <div ref={gradeRef} tabIndex={-1} className="mt-4 outline-none">
        {!flipped ? (
          <Button size="lg" className="h-11 w-full" onClick={flip}>
            Flip
            <kbd
              aria-hidden="true"
              className="ml-1 hidden rounded-[3px] border border-primary-foreground/30 px-1 font-sans text-2xs sm:inline"
            >
              Space
            </kbd>
          </Button>
        ) : notePrompt ? (
          <div className="rounded-md border border-border bg-surface p-3">
            <label htmlFor="went-wrong" className="text-md font-medium">
              What went wrong? <span className="font-normal text-fg-subtle">optional</span>
            </label>
            <input
              id="went-wrong"
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveNote(false);
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  void saveNote(true);
                }
              }}
              placeholder="Forgot to handle the empty window"
              className={cn(inputClass, "mt-2")}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-2xs text-fg-muted">
                <input
                  type="checkbox"
                  checked={appendPitfalls}
                  onChange={(e) => setAppendPitfalls(e.target.checked)}
                  className="size-3.5 accent-(--primary)"
                />
                Add to pitfalls
              </label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => saveNote(true)}>
                  Skip
                </Button>
                <Button size="sm" onClick={() => saveNote(false)}>
                  Save and continue
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <RatingButtons
            mode={mode}
            hotkeys
            previews={previewLabels}
            easyDisabled={mode === "revise" && !props.allowEasyInRevise}
            onRate={grade}
            disabled={grading}
            size="lg"
          />
        )}
      </div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Edit {props.title}</SheetTitle>
            <SheetDescription>Changes show on the next card render.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <ProblemForm
              mode="edit"
              tags={props.editTags}
              initial={props.editInitial}
              problemId={props.problemId}
              onSaved={() => setEditOpen(false)}
              onCancel={() => setEditOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
      <HelpSheet open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
