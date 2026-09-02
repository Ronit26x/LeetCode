"use client";

import * as React from "react";
import { Check, Copy } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Copies the raw source passed in as a prop, never the rendered DOM. */
export function CopyButton({
  text,
  className,
  label = "Copy code",
}: {
  text: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<number | null>(null);
  React.useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy. Select the code and copy it by hand.");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-sm px-1.5 text-2xs font-medium text-fg-muted transition-colors hover:bg-hover hover:text-foreground",
        className,
      )}
    >
      {copied ? <Check size={14} className="text-good" /> : <Copy size={14} />}
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
