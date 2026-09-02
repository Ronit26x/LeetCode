"use client";

import * as React from "react";
import { ProblemActions } from "@/components/problems/problem-actions";
import { ProblemForm, type ProblemFormValues } from "@/components/problems/problem-form";
import type { TagBrief } from "@/lib/problems/queries";
import type { ProblemStatus } from "@/db/schema";
import { isTypingTarget } from "@/lib/hotkeys";
import { useRouter } from "next/navigation";

/** Holds the edit state; the read view is server-rendered and passed in as children. */
export function ProblemDetailShell({
  id,
  status,
  hasCard,
  tags,
  initial,
  header,
  children,
  aside,
}: {
  id: string;
  status: ProblemStatus;
  hasCard: boolean;
  tags: TagBrief[];
  initial: ProblemFormValues;
  header: React.ReactNode;
  children: React.ReactNode;
  aside: React.ReactNode;
}) {
  const [editing, setEditing] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        setEditing((v) => !v);
      }
      if ((e.key === "r" || e.key === "R") && hasCard && !editing) {
        e.preventDefault();
        router.push(`/review?problem=${id}`);
      }
      if (e.key === "Escape" && editing) setEditing(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, hasCard, id, router]);

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">{header}</div>
        <ProblemActions
          id={id}
          status={status}
          hasCard={hasCard}
          onEdit={() => setEditing((v) => !v)}
          editing={editing}
        />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          {editing ? (
            <ProblemForm
              mode="edit"
              tags={tags}
              initial={initial}
              problemId={id}
              onSaved={() => setEditing(false)}
              onCancel={() => setEditing(false)}
            />
          ) : (
            children
          )}
        </div>
        <div className="min-w-0">{aside}</div>
      </div>
    </>
  );
}
