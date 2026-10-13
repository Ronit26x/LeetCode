"use client";

import type { RoadmapMarkStatus } from "@/lib/roadmap/marks";
import { cn } from "@/lib/utils";

const buttonClass =
  "h-7 px-2.5 text-md font-medium text-fg-muted transition-colors duration-150 pointer-coarse:h-11 pointer-coarse:px-4 hover:text-foreground focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px]";

/** Done / Redo as a two-button group. Pressing the active one clears it. */
export function MarkButtons({
  title,
  status,
  onToggle,
}: {
  title: string;
  status: RoadmapMarkStatus | null;
  onToggle: (value: RoadmapMarkStatus) => void;
}) {
  return (
    <div
      role="group"
      aria-label={`Status for ${title}`}
      className="inline-flex shrink-0 overflow-hidden rounded-md border border-border bg-surface"
    >
      <button
        type="button"
        aria-pressed={status === "done"}
        onClick={() => onToggle("done")}
        className={cn(buttonClass, status === "done" && "bg-good/14 text-good hover:text-good")}
      >
        Done
      </button>
      <button
        type="button"
        aria-pressed={status === "redo"}
        onClick={() => onToggle("redo")}
        className={cn(
          buttonClass,
          "border-l border-border",
          status === "redo" && "bg-hard/14 text-hard hover:text-hard",
        )}
      >
        Redo
      </button>
    </div>
  );
}
