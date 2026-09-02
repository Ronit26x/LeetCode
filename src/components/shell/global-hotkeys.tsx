"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { openCommandPalette } from "@/components/shell/command-palette";
import { GLOBAL_KEYS, KEYS } from "@/lib/rubric";
import { isTypingTarget } from "@/lib/hotkeys";

const GO: Record<string, string> = {
  t: "/today",
  b: "/backlog",
  p: "/problems",
  s: "/stats",
  ",": "/settings",
};

/**
 * Single-key navigation everywhere except the session (which owns its keys) and text fields.
 * N adds a problem, / opens the palette, G then a letter jumps to a page, ? opens this help.
 */
export function GlobalHotkeys() {
  const router = useRouter();
  const pathname = usePathname();
  const [help, setHelp] = React.useState(false);
  const pendingG = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (pathname.startsWith("/review")) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const key = e.key;
      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        const href = GO[key.toLowerCase()];
        if (href) {
          e.preventDefault();
          router.push(href);
          return;
        }
      }
      switch (key) {
        case "g":
        case "G":
          e.preventDefault();
          pendingG.current = window.setTimeout(() => (pendingG.current = null), 1200);
          break;
        case "n":
        case "N":
          e.preventDefault();
          router.push("/problems/new");
          break;
        case "/":
          e.preventDefault();
          openCommandPalette();
          break;
        case "?":
          e.preventDefault();
          setHelp(true);
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, router]);

  return (
    <Dialog open={help} onOpenChange={setHelp}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard</DialogTitle>
          <DialogDescription>Single keys stay inert while you are typing.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-2xs font-medium text-fg-subtle">Anywhere</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-md">
              {GLOBAL_KEYS.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt>
                    <kbd className="rounded-[3px] border border-border bg-sunken px-1.5 font-sans text-2xs font-medium whitespace-nowrap">
                      {k}
                    </kbd>
                  </dt>
                  <dd className="text-fg-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <p className="mb-1.5 text-2xs font-medium text-fg-subtle">In a session</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-md">
              {KEYS.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt>
                    <kbd className="rounded-[3px] border border-border bg-sunken px-1.5 font-sans text-2xs font-medium whitespace-nowrap">
                      {k}
                    </kbd>
                  </dt>
                  <dd className="text-fg-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
