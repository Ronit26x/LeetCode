import { cn } from "@/lib/utils";

/** The Recur mark: a loop with one gap, the interval before a problem comes back. */
export function Mark({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray="41.9 8.4"
        transform="rotate(-60 12 12)"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Mark className="text-foreground" />
      <span className="display text-[19px] leading-none text-foreground">Recur</span>
    </span>
  );
}
