import { cn } from "@/lib/utils";

/** Label above, control, helper text below. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
  right,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-md font-medium text-foreground">
          {label}
        </label>
        {right}
      </div>
      {children}
      {error ? (
        <p className="text-2xs text-again" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-2xs text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "h-9 w-full rounded-md border border-border bg-surface px-2.5 text-sm text-foreground placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-1 disabled:opacity-50";

export const textareaClass =
  "w-full resize-y rounded-md border border-border bg-surface px-2.5 py-2 text-sm leading-6 text-foreground placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-1 disabled:opacity-50";
