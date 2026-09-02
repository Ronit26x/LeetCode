"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resetFsrsWeights, updateFsrsWeights } from "@/lib/settings/actions";
import { DEFAULT_FSRS_W } from "@/db/defaults";
import { cn } from "@/lib/utils";

export function FsrsParams({ weights }: { weights: number[] }) {
  const router = useRouter();
  const [advanced, setAdvanced] = React.useState(false);
  const [text, setText] = React.useState(JSON.stringify(weights));
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const isDefault =
    weights.length === DEFAULT_FSRS_W.length &&
    weights.every((w, i) => Math.abs(w - DEFAULT_FSRS_W[i]) < 1e-9);

  function save() {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError("Not valid JSON. Expected an array of 21 numbers.");
      return;
    }
    start(async () => {
      const res = await updateFsrsWeights(parsed);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success("Weights saved");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-md text-fg-muted">
        FSRS-6 with the library defaults{isDefault ? "" : " (customized)"}. Decay w20 ={" "}
        {weights[20]?.toFixed(4)}. Every grade, preview and prediction goes through ts-fsrs with
        these weights.
      </p>
      <ol className="grid grid-cols-3 gap-x-4 gap-y-1 font-mono text-2xs text-fg-muted sm:grid-cols-7">
        {weights.map((w, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span className="text-fg-subtle">w{i}</span>
            <span className="text-foreground">{w.toFixed(4)}</span>
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAdvanced((a) => !a)}
          aria-expanded={advanced}
        >
          {advanced ? "Hide editor" : "Advanced"}
        </Button>
        {!isDefault ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await resetFsrsWeights();
                if (!res.ok) toast.error(res.error);
                else {
                  toast.success("Defaults restored");
                  setText(JSON.stringify(DEFAULT_FSRS_W));
                  router.refresh();
                }
              })
            }
          >
            Reset to defaults
          </Button>
        ) : null}
      </div>
      {advanced ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            spellCheck={false}
            aria-label="FSRS weights as a JSON array"
            className={cn(
              "w-full rounded-md border border-border bg-sunken px-3 py-2 font-mono text-md leading-5 focus-visible:outline-2 focus-visible:outline-offset-1",
            )}
          />
          {error ? (
            <p role="alert" className="text-2xs text-again">
              {error}
            </p>
          ) : (
            <p className="text-2xs text-fg-subtle">
              21 numbers, validated by ts-fsrs before saving. Paste the output of an optimizer run
              here.
            </p>
          )}
          <div>
            <Button size="sm" onClick={save} disabled={pending}>
              Save weights
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
