"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RatingButtons, type RatingValue } from "@/components/review/rating-buttons";
import { inputClass } from "@/components/common/field";
import { markSolved } from "@/lib/problems/actions";
import { formatInterval } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Two doors out of the backlog, both creating the card at this moment:
 * resolve = "Solved it (again)", the first rating is resolve #1;
 * revise = "Still remember it", the first rating is revise #1 with Easy disabled.
 */
export function MarkSolvedDialog({
  id,
  title,
  mode = "resolve",
  label,
  variant = "default",
  size = "sm",
  allowEasyInRevise = false,
}: {
  id: string;
  title: string;
  mode?: "resolve" | "revise";
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default";
  allowEasyInRevise?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [minutes, setMinutes] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function rate(rating: RatingValue) {
    startTransition(async () => {
      const mins = Number(minutes);
      const res = await markSolved({
        id,
        rating,
        mode,
        durationSeconds:
          mode === "resolve" && minutes.trim() && Number.isFinite(mins)
            ? Math.round(mins * 60)
            : null,
        clientReviewId: crypto.randomUUID(),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Scheduled. Next review in ${formatInterval(res.data.scheduledDays)}.`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size={size} variant={variant} />}>
        {label ?? (mode === "revise" ? "Still remember it" : "Solved it")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "revise" ? "How well do you remember it?" : "How did the solve go?"}
          </DialogTitle>
          <DialogDescription>
            {title}.{" "}
            {mode === "revise"
              ? "Grade your recall of the approach without re-coding. The card starts now; Easy is earned by resolving."
              : "Picking a grade creates the card now and schedules the first review."}
          </DialogDescription>
        </DialogHeader>
        {mode === "resolve" ? (
          <label className="flex items-center justify-between gap-2 text-md text-fg-muted">
            Minutes spent (optional)
            <input
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              inputMode="numeric"
              className={cn(inputClass, "h-8 w-20 text-md")}
              placeholder="30"
            />
          </label>
        ) : null}
        <RatingButtons
          mode={mode === "revise" ? "revise" : "first"}
          showRubric
          onRate={rate}
          disabled={pending}
          easyDisabled={mode === "revise" && !allowEasyInRevise}
        />
      </DialogContent>
    </Dialog>
  );
}
