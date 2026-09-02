"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUUpLeft } from "@phosphor-icons/react/dist/ssr";
import { undoGrade } from "@/lib/review/actions";

/** Undo for the most recent review in the History panel. Only the latest grade can be undone. */
export function UndoLogButton({ logId, isFirst }: { logId: string; isFirst: boolean }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await undoGrade({ logId });
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success(
            isFirst
              ? "Undone. Back in the backlog, no card."
              : "Undone. Card restored to its previous state.",
          );
          router.refresh();
        })
      }
      className="inline-flex h-6 items-center gap-1 rounded-sm px-1.5 text-2xs font-medium text-fg-muted hover:bg-hover hover:text-foreground disabled:opacity-50"
      aria-label="Undo this review"
    >
      <ArrowUUpLeft size={12} />
      Undo
    </button>
  );
}
