"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Archive, ArrowCounterClockwise, DotsThree, PauseCircle, PencilSimple, Play, Trash } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { archiveProblems, deleteProblem, resetCards, suspendProblems, unsuspendProblems } from "@/lib/problems/actions";
import type { ProblemStatus } from "@/db/schema";

export function ProblemActions({
  id,
  status,
  hasCard,
  onEdit,
  editing,
}: {
  id: string;
  status: ProblemStatus;
  hasCard: boolean;
  onEdit: () => void;
  editing: boolean;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = React.useState<"reset" | "delete" | null>(null);
  const [pending, startTransition] = React.useTransition();

  function run(label: string, fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? "Something went wrong.");
        return;
      }
      toast.success(label);
      if (after) after();
      else router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {status === "active" && hasCard ? (
        <Button render={<Link href={`/review?problem=${id}`} />}>Review now</Button>
      ) : null}
      <Button variant="outline" onClick={onEdit} aria-pressed={editing}>
        <PencilSimple size={16} />
        {editing ? "Editing" : "Edit"}
        <kbd className="hidden rounded-[3px] border border-border px-1 font-sans text-2xs text-fg-subtle sm:inline">E</kbd>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="More actions" />}>
          <DotsThree size={18} weight="bold" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {status === "suspended" ? (
            <DropdownMenuItem disabled={pending} onClick={() => run("Unsuspended", () => unsuspendProblems([id]))}>
              <Play /> Unsuspend
            </DropdownMenuItem>
          ) : status === "active" ? (
            <DropdownMenuItem disabled={pending} onClick={() => run("Suspended", () => suspendProblems([id]))}>
              <PauseCircle /> Suspend
            </DropdownMenuItem>
          ) : null}
          {hasCard ? (
            <DropdownMenuItem disabled={pending} onClick={() => setConfirm("reset")}>
              <ArrowCounterClockwise /> Reset card
            </DropdownMenuItem>
          ) : null}
          {status !== "archived" ? (
            <DropdownMenuItem disabled={pending} onClick={() => run("Archived", () => archiveProblems([id]))}>
              <Archive /> Archive
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled={pending} onClick={() => run("Restored", () => unsuspendProblems([id]))}>
              <Play /> Restore
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" disabled={pending} onClick={() => setConfirm("delete")}>
            <Trash /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirm === "reset"} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset this card?</AlertDialogTitle>
            <AlertDialogDescription>Memory state goes back to new and it becomes due now. The review history stays.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirm(null);
                run("Card reset", () => resetCards([id]));
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirm === "delete"} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this problem?</AlertDialogTitle>
            <AlertDialogDescription>The card, snippets, notes and every review log go with it. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirm(null);
                run("Deleted", () => deleteProblem(id), () => router.push("/problems"));
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
