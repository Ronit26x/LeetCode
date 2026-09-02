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

export function MarkSolvedDialog({
  id,
  title,
  size = "sm",
}: {
  id: string;
  title: string;
  size?: "sm" | "default";
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
        durationSeconds: minutes.trim() && Number.isFinite(mins) ? Math.round(mins * 60) : null,
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
      <DialogTrigger render={<Button size={size} />}>Solved it</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>How did the solve go?</DialogTitle>
          <DialogDescription>
            {title}. Picking a grade schedules the first review.
          </DialogDescription>
        </DialogHeader>
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
        <RatingButtons mode="first" showRubric onRate={rate} disabled={pending} />
      </DialogContent>
    </Dialog>
  );
}
