"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  /** Hide the label visually and show it as a tooltip instead. */
  iconOnly?: boolean;
  disabled?: boolean;
  hint?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T | undefined;
  onValueChange: (value: T) => void;
  options: SegmentedOption<T>[];
  "aria-label": string;
  size?: "sm" | "md" | "lg";
  className?: string;
  fullWidth?: boolean;
}

/**
 * A radiogroup rendered as a segmented control. Arrow keys move the selection,
 * Space and Enter keep their native button behavior.
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  size = "md",
  className,
  fullWidth,
  ...rest
}: SegmentedControlProps<T>) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
    if (enabled.length === 0) return;
    let next: number | null = null;
    const pos = enabled.indexOf(index);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = enabled[(pos + 1) % enabled.length];
    if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = enabled[(pos - 1 + enabled.length) % enabled.length];
    if (e.key === "Home") next = enabled[0];
    if (e.key === "End") next = enabled[enabled.length - 1];
    if (next === null) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onValueChange(options[next].value);
  }

  const heights = { sm: "h-7", md: "h-8", lg: "h-10" }[size];
  const text = { sm: "text-xs", md: "text-md", lg: "text-sm" }[size];

  return (
    <div
      role="radiogroup"
      aria-label={rest["aria-label"]}
      className={cn(
        "inline-flex items-stretch gap-0.5 rounded-md border border-border bg-sunken p-0.5",
        fullWidth && "flex w-full",
        className,
      )}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value;
        const button = (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={opt.iconOnly ? opt.label : undefined}
            tabIndex={selected || (value === undefined && i === 0) ? 0 : -1}
            disabled={opt.disabled}
            data-selected={selected ? "" : undefined}
            onClick={() => onValueChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-[4px] px-2.5 font-medium whitespace-nowrap text-fg-muted transition-colors duration-150 select-none",
              heights,
              text,
              fullWidth && "flex-1",
              opt.iconOnly && "min-w-8 px-0",
              "hover:text-foreground focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
              "disabled:cursor-not-allowed disabled:opacity-40",
              selected &&
                "bg-surface text-foreground shadow-[0_1px_1px_oklch(0_0_0/0.06)] ring-1 ring-border",
            )}
          >
            {opt.icon}
            {!opt.iconOnly && <span>{opt.label}</span>}
          </button>
        );
        if (opt.iconOnly || opt.hint) {
          return (
            <Tooltip key={opt.value}>
              <TooltipTrigger render={button} />
              <TooltipContent>{opt.hint ?? opt.label}</TooltipContent>
            </Tooltip>
          );
        }
        return button;
      })}
    </div>
  );
}
