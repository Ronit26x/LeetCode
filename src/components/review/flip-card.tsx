"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function useReducedMotion() {
  return React.useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * A real 3D flip whose container eases to the height of the visible face.
 * Under prefers-reduced-motion it is a crossfade.
 */
export function FlipCard({
  flipped,
  front,
  back,
  onFlip,
  className,
}: {
  flipped: boolean;
  front: React.ReactNode;
  back: React.ReactNode;
  onFlip?: () => void;
  className?: string;
}) {
  const frontRef = React.useRef<HTMLDivElement>(null);
  const backRef = React.useRef<HTMLDivElement>(null);
  const [heights, setHeights] = React.useState<{ front: number; back: number }>({
    front: 0,
    back: 0,
  });
  const reduced = useReducedMotion();

  React.useEffect(() => {
    const f = frontRef.current;
    const b = backRef.current;
    if (!f || !b) return;
    const ro = new ResizeObserver(() => {
      setHeights({ front: f.offsetHeight, back: b.offsetHeight });
    });
    ro.observe(f);
    ro.observe(b);
    return () => ro.disconnect();
  }, []);

  const height = flipped ? heights.back : heights.front;
  const hintId = React.useId();

  return (
    <div className={cn("[perspective:1400px]", className)}>
      <span id={hintId} className="sr-only">
        {flipped ? "Press Space to turn the card back over" : "Press Space or click to flip the card"}
      </span>
      <div
        role="group"
        tabIndex={0}
        aria-label={flipped ? "Card back" : "Card front"}
        aria-describedby={hintId}
        onClick={() => {
          if (!flipped) onFlip?.();
        }}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onFlip?.();
          }
        }}
        data-card
        className={cn(
          "relative rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          !flipped && "cursor-pointer",
          !reduced && "transition-[height] duration-300 ease-(--ease-out-quart)",
        )}
        style={{ height: height || undefined }}
      >
        <div
          className={cn(
            "absolute inset-0 [transform-style:preserve-3d]",
            !reduced && "transition-transform duration-[350ms] ease-(--ease-out-quart)",
            !reduced && flipped && "[transform:rotateY(180deg)]",
          )}
        >
          {/* The hidden face also gets visibility: hidden, swapped at the midpoint of the flip, so it is out of the page for real. */}
          <div
            ref={frontRef}
            inert={flipped}
            aria-hidden={flipped}
            style={{
              visibility: flipped ? "hidden" : "visible",
              transition: reduced ? "opacity 150ms, visibility 0s 150ms" : "visibility 0s 175ms",
            }}
            className={cn(
              "absolute inset-x-0 top-0 rounded-xl border border-border bg-surface p-5 [backface-visibility:hidden] sm:p-8",
              reduced && flipped && "opacity-0",
            )}
          >
            {front}
          </div>
          <div
            ref={backRef}
            inert={!flipped}
            aria-hidden={!flipped}
            style={{
              visibility: flipped ? "visible" : "hidden",
              transition: reduced ? "opacity 150ms, visibility 0s 150ms" : "visibility 0s 175ms",
            }}
            className={cn(
              "absolute inset-x-0 top-0 rounded-xl border border-border bg-surface p-5 [backface-visibility:hidden] sm:p-8",
              !reduced && "[transform:rotateY(180deg)]",
              reduced && !flipped && "opacity-0",
            )}
          >
            {back}
          </div>
        </div>
      </div>
    </div>
  );
}
