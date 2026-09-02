import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  body,
  actions,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-border bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? <div className="mb-4 text-fg-subtle">{icon}</div> : null}
      <h2 className="display text-xl leading-7">{title}</h2>
      {body ? <p className="mt-2 max-w-md text-sm text-fg-muted">{body}</p> : null}
      {actions ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
    </div>
  );
}
