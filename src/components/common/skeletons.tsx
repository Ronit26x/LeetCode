import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-sm bg-sunken", className)} aria-hidden />;
}

/** Page header shape: a serif-sized title line and a description line. */
export function HeaderSkeleton({ actions }: { actions?: boolean }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-3">
      <div>
        <Bar className="h-7 w-40" />
        <Bar className="mt-2 h-4 w-72" />
      </div>
      {actions ? <Bar className="h-9 w-32" /> : null}
    </div>
  );
}

/** A list of rows, matching the queue and library rhythm. */
export function RowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border rounded-md border border-border" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <Bar className="h-4 w-8" />
          <Bar className="h-4 flex-1" />
          <Bar className="hidden h-4 w-16 sm:block" />
          <Bar className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="mx-auto max-w-[680px]" aria-busy="true" aria-label="Loading">
      <div className="mb-3 flex items-center gap-3">
        <Bar className="h-4 w-12" />
        <Bar className="h-7 w-40" />
      </div>
      <div className="mb-4 h-px bg-border" />
      <div className="rounded-xl border border-border bg-surface p-5 sm:p-8">
        <Bar className="h-4 w-48" />
        <Bar className="mt-5 h-8 w-3/4" />
        <Bar className="mt-4 h-5 w-full" />
        <Bar className="mt-2 h-5 w-5/6" />
      </div>
      <Bar className="mt-4 h-11 w-full" />
    </div>
  );
}

export function PanelsSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-surface p-5">
          <Bar className="h-4 w-32" />
          <Bar className="mt-3 h-4 w-full" />
          <Bar className="mt-2 h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
