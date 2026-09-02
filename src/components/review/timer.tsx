"use client";

import * as React from "react";
import { Pause, Play, ArrowCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

function fmt(s: number) {
  const m = Math.floor(Math.abs(s) / 60);
  const sec = Math.abs(s) % 60;
  return `${s < 0 ? "-" : ""}${m}:${sec.toString().padStart(2, "0")}`;
}

export interface TimerControls {
  elapsed: () => number;
  pause: () => void;
}

/** Countdown from a preset target with start, pause and reset. The parent reads elapsed seconds on grade. */
export function ResolveTimer({
  presets,
  initialMinutes,
  controlsRef,
  className,
}: {
  presets: number[];
  initialMinutes: number;
  controlsRef: React.MutableRefObject<TimerControls>;
  className?: string;
}) {
  const [target, setTarget] = React.useState(initialMinutes * 60);
  const [running, setRunning] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const startedAt = React.useRef<number | null>(null);
  const base = React.useRef(0);

  const read = React.useCallback(() => {
    if (startedAt.current !== null)
      return base.current + Math.floor((Date.now() - startedAt.current) / 1000);
    return base.current;
  }, []);

  React.useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed(read()), 250);
    return () => window.clearInterval(id);
  }, [running, read]);

  React.useEffect(() => {
    controlsRef.current = {
      elapsed: read,
      pause: () => {
        if (startedAt.current !== null) {
          base.current = read();
          startedAt.current = null;
          setRunning(false);
        }
      },
    };
  }, [controlsRef, read]);

  function toggle() {
    if (startedAt.current !== null) {
      base.current = read();
      startedAt.current = null;
      setRunning(false);
    } else {
      startedAt.current = Date.now();
      setRunning(true);
    }
  }
  function reset() {
    base.current = 0;
    if (startedAt.current !== null) startedAt.current = Date.now();
    setElapsed(0);
  }

  const remaining = target - elapsed;
  const over = remaining < 0;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div
        className="flex items-center rounded-md border border-border bg-sunken p-0.5"
        role="group"
        aria-label="Time target"
      >
        {presets.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setTarget(m * 60)}
            aria-pressed={target === m * 60}
            className={cn(
              "h-7 rounded-[4px] px-2 text-2xs font-medium text-fg-muted hover:text-foreground",
              target === m * 60 && "bg-surface text-foreground ring-1 ring-border",
            )}
          >
            {m}m
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-label={`${running ? "Pause" : "Start"} timer, ${fmt(remaining)}`}
        className={cn(
          "inline-flex h-8 min-w-24 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-md font-medium tabular-nums",
          over ? "text-hard" : running ? "text-foreground" : "text-fg-muted",
        )}
      >
        {running ? <Pause size={14} weight="fill" /> : <Play size={14} weight="fill" />}
        <span>{fmt(remaining)}</span>
      </button>
      {elapsed > 0 ? (
        <button
          type="button"
          onClick={reset}
          aria-label="Reset timer"
          className="inline-flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-foreground"
        >
          <ArrowCounterClockwise size={14} />
        </button>
      ) : null}
      {over ? <span className="text-2xs text-hard">over target</span> : null}
    </div>
  );
}
