"use client";

import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isTypingTarget } from "@/lib/hotkeys";

export type RatingValue = 1 | 2 | 3 | 4;
export type RubricMode = "first" | "revise" | "resolve";

export const RATING_NAMES: Record<RatingValue, string> = { 1: "Again", 2: "Hard", 3: "Good", 4: "Easy" };

export const RUBRIC: Record<RubricMode, Record<RatingValue, string>> = {
  first: {
    1: "Needed the editorial",
    2: "Solved with real struggle or hints",
    3: "Solved it",
    4: "Trivial",
  },
  revise: {
    1: "Could not recall the key insight",
    2: "Recalled only after a long struggle, or missed an important detail or edge case",
    3: "Recalled the insight, approach and complexity within about two minutes",
    4: "Easy is earned by resolving. Enable it for revises in Settings if you want it here",
  },
  resolve: {
    1: "Could not produce a working solution without opening the notes",
    2: "Working, but over the time target, needed hints, or had bugs",
    3: "Clean solution within the time target",
    4: "Fast, clean, and could explain the variants",
  },
};

const COLOR: Record<RatingValue, string> = {
  1: "text-again hover:bg-again/10 focus-visible:outline-again data-pressed:bg-again/16",
  2: "text-hard hover:bg-hard/12 focus-visible:outline-hard data-pressed:bg-hard/18",
  3: "text-good hover:bg-good/10 focus-visible:outline-good data-pressed:bg-good/16",
  4: "text-easy hover:bg-easy/10 focus-visible:outline-easy data-pressed:bg-easy/16",
};

export function RatingButtons({
  mode,
  onRate,
  previews,
  easyDisabled,
  hotkeys,
  disabled,
  size = "md",
  className,
  showRubric,
}: {
  mode: RubricMode;
  onRate: (rating: RatingValue) => void;
  /** Interval labels from f.repeat, e.g. "6d". */
  previews?: Partial<Record<RatingValue, string>>;
  easyDisabled?: boolean;
  /** Keys 1-4 grade, inert while typing or inside a dialog. */
  hotkeys?: boolean;
  disabled?: boolean;
  size?: "md" | "lg";
  className?: string;
  /** Show the short rubric under the label (first-rating step). */
  showRubric?: boolean;
}) {
  const [pressed, setPressed] = React.useState<RatingValue | null>(null);

  const rate = React.useCallback(
    (r: RatingValue) => {
      if (disabled) return;
      if (r === 4 && easyDisabled) return;
      setPressed(r);
      window.setTimeout(() => setPressed(null), 180);
      onRate(r);
    },
    [disabled, easyDisabled, onRate],
  );

  React.useEffect(() => {
    if (!hotkeys) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key >= "1" && e.key <= "4") {
        e.preventDefault();
        rate(Number(e.key) as RatingValue);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkeys, rate]);

  return (
    <div className={cn("grid grid-cols-4 gap-2", className)} role="group" aria-label="Grade">
      {([1, 2, 3, 4] as RatingValue[]).map((r) => {
        const isDisabled = disabled || (r === 4 && easyDisabled);
        const button = (
          <button
            type="button"
            disabled={isDisabled}
            data-pressed={pressed === r ? "" : undefined}
            onClick={() => rate(r)}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center rounded-md border border-border bg-surface px-2 py-2 transition-colors duration-150 select-none focus-visible:outline-2 focus-visible:outline-offset-1 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40",
              size === "lg" ? "min-h-14" : "",
              COLOR[r],
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              {RATING_NAMES[r]}
              {hotkeys ? (
                <kbd className="hidden rounded-[3px] border border-border px-1 font-sans text-2xs font-medium text-fg-subtle sm:inline">
                  {r}
                </kbd>
              ) : null}
            </span>
            {previews?.[r] ? <span className="mt-0.5 text-2xs text-fg-muted">{previews[r]}</span> : null}
            {showRubric ? (
              <span className="mt-1 text-center text-2xs leading-4 text-fg-muted">{RUBRIC[mode][r]}</span>
            ) : null}
          </button>
        );
        return (
          <Tooltip key={r}>
            <TooltipTrigger render={button} />
            <TooltipContent className="max-w-56 text-center">{RUBRIC[mode][r]}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
