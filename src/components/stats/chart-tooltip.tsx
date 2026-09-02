"use client";

import * as React from "react";

/**
 * One floating tooltip for every chart on the page. Any element with data-tip shows it on hover
 * and keyboard focus; the value is also always in a table view, so the tooltip never gates.
 */
export function ChartTooltipLayer({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [tip, setTip] = React.useState<{ text: string; x: number; y: number } | null>(null);

  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;
    function show(target: Element, clientX?: number, clientY?: number) {
      const el = target.closest<HTMLElement>("[data-tip]");
      if (!el || !root!.contains(el)) return setTip(null);
      const rect = el.getBoundingClientRect();
      const rootRect = root!.getBoundingClientRect();
      const x = (clientX ?? rect.left + rect.width / 2) - rootRect.left;
      const y = (clientY ?? rect.top) - rootRect.top;
      setTip({ text: el.dataset.tip ?? "", x, y });
    }
    function onMove(e: MouseEvent) {
      show(e.target as Element, e.clientX, e.clientY);
    }
    function onLeave() {
      setTip(null);
    }
    function onFocus(e: FocusEvent) {
      show(e.target as Element);
    }
    root.addEventListener("mousemove", onMove);
    root.addEventListener("mouseleave", onLeave);
    root.addEventListener("focusin", onFocus);
    root.addEventListener("focusout", onLeave);
    return () => {
      root.removeEventListener("mousemove", onMove);
      root.removeEventListener("mouseleave", onLeave);
      root.removeEventListener("focusin", onFocus);
      root.removeEventListener("focusout", onLeave);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      {children}
      {tip ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full rounded-md bg-foreground px-2 py-1 text-2xs whitespace-nowrap text-background shadow-float"
          style={{ left: tip.x, top: tip.y - 8 }}
        >
          {tip.text}
        </div>
      ) : null}
    </div>
  );
}
