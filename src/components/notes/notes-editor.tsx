"use client";

import * as React from "react";
import { SegmentedControl } from "@/components/common/segmented-control";
import { MarkdownClient } from "@/components/notes/markdown-client";
import { cn } from "@/lib/utils";

/** Markdown textarea with a preview toggle. Tab inserts four spaces; nothing is reformatted. */
export function NotesEditor({
  id,
  value,
  onChange,
  placeholder,
  minRows = 6,
  className,
  mono = true,
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
  mono?: boolean;
  ariaLabel?: string;
}) {
  const [mode, setMode] = React.useState<"edit" | "preview">("edit");
  const ref = React.useRef<HTMLTextAreaElement>(null);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab" || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: s, selectionEnd: end } = el;
    if (e.shiftKey) {
      const lineStart = value.lastIndexOf("\n", s - 1) + 1;
      const head = value.slice(lineStart, s);
      const m = /^ {1,4}/.exec(value.slice(lineStart));
      if (!m) return;
      const removed = m[0].length;
      const next = value.slice(0, lineStart) + value.slice(lineStart + removed);
      onChange(next);
      requestAnimationFrame(() => {
        const pos = Math.max(lineStart, s - Math.min(removed, head.length));
        el.setSelectionRange(pos, pos);
      });
      return;
    }
    const next = value.slice(0, s) + "    " + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => el.setSelectionRange(s + 4, s + 4));
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <SegmentedControl<"edit" | "preview">
          aria-label="Notes view"
          size="sm"
          value={mode}
          onValueChange={setMode}
          options={[
            { value: "edit", label: "Edit" },
            { value: "preview", label: "Preview" },
          ]}
        />
        <span className="text-2xs text-fg-subtle">Markdown. Tab indents.</span>
      </div>
      {mode === "edit" ? (
        <textarea
          id={id}
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={Math.max(minRows, Math.min(40, value.split("\n").length + 1))}
          spellCheck={false}
          aria-label={ariaLabel}
          className={cn(
            "w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm leading-6 text-foreground placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-1",
            mono && "font-mono text-md leading-5",
          )}
          style={{ tabSize: 4 }}
        />
      ) : (
        <div className="min-h-24 rounded-md border border-border bg-surface px-4 py-3">
          <MarkdownClient source={value} />
        </div>
      )}
    </div>
  );
}
