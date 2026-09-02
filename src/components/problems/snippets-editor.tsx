"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Plus, Trash } from "@phosphor-icons/react/dist/ssr";
import { NativeSelect } from "@/components/common/native-select";
import { inputClass } from "@/components/common/field";
import type { SnippetLanguage } from "@/db/schema";
import { cn } from "@/lib/utils";

const CodeEditor = dynamic(
  () => import("@/components/code/code-editor").then((m) => m.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[180px] animate-pulse rounded-md border border-border bg-sunken"
        aria-hidden
      />
    ),
  },
);

export interface SnippetDraft {
  id: string;
  label: string;
  language: SnippetLanguage;
  code: string;
}

export function newSnippet(partial: Partial<SnippetDraft> = {}): SnippetDraft {
  return { id: crypto.randomUUID(), label: "Optimal", language: "cpp", code: "", ...partial };
}

const LANGS: { value: SnippetLanguage; label: string }[] = [
  { value: "cpp", label: "C++" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "text", label: "Text" },
];

export function SnippetsEditor({
  value,
  onChange,
  className,
}: {
  value: SnippetDraft[];
  onChange: (list: SnippetDraft[]) => void;
  className?: string;
}) {
  function update(id: string, patch: Partial<SnippetDraft>) {
    onChange(value.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {value.map((s, i) => (
        <div key={s.id} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              value={s.label}
              onChange={(e) => update(s.id, { label: e.target.value })}
              placeholder="Label"
              aria-label={`Snippet ${i + 1} label`}
              className={cn(inputClass, "h-8 max-w-48")}
            />
            <NativeSelect
              size="sm"
              value={s.language}
              aria-label={`Snippet ${i + 1} language`}
              onChange={(e) => update(s.id, { language: e.target.value as SnippetLanguage })}
              className="w-28"
            >
              {LANGS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </NativeSelect>
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x.id !== s.id))}
              aria-label={`Remove snippet ${s.label || i + 1}`}
              className="ml-auto inline-flex size-8 items-center justify-center rounded-md text-fg-muted hover:bg-hover hover:text-again"
            >
              <Trash size={16} />
            </button>
          </div>
          <CodeEditor
            value={s.code}
            onChange={(code) => update(s.id, { code })}
            language={s.language}
            ariaLabel={`Snippet ${s.label || i + 1} code`}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([...value, newSnippet({ label: value.length ? "Follow-up" : "Optimal" })])
        }
        className="inline-flex h-8 w-fit items-center gap-1.5 rounded-md border border-dashed border-border-strong px-2.5 text-md font-medium text-fg-muted hover:text-foreground"
      >
        <Plus size={14} />
        Add snippet
      </button>
    </div>
  );
}
