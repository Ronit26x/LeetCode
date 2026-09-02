"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RUBRIC } from "@/components/review/rating-buttons";

const KEYS: [string, string][] = [
  ["Space", "Flip the card"],
  ["1 – 4", "Again, Hard, Good, Easy"],
  ["R", "Toggle Revise / Resolve"],
  ["N", "Open or close the notes"],
  ["C", "Open or close the code"],
  ["O", "Open the problem on LeetCode"],
  ["Z", "Undo the last grade"],
  ["E", "Edit the problem in a side sheet"],
  ["Esc", "Leave the session"],
  ["?", "This sheet"],
];

export function HelpSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard and rubric</DialogTitle>
          <DialogDescription>Single keys stay inert while you are typing.</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-md">
          {KEYS.map(([k, v]) => (
            <div key={k} className="contents">
              <dt>
                <kbd className="rounded-[3px] border border-border bg-sunken px-1.5 font-sans text-2xs font-medium">{k}</kbd>
              </dt>
              <dd className="text-fg-muted">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["revise", "resolve"] as const).map((mode) => (
            <div key={mode}>
              <h3 className="mb-1 text-md font-medium capitalize">{mode}</h3>
              <ul className="flex flex-col gap-1 text-2xs text-fg-muted">
                {([1, 2, 3, 4] as const).map((r) => (
                  <li key={r}>
                    <span className="font-medium text-foreground">{["", "Again", "Hard", "Good", "Easy"][r]}</span>: {RUBRIC[mode][r]}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
