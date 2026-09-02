import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/** A native select with the app's chrome. Native pickers are the fastest control on a phone. */
export function NativeSelect({
  className,
  children,
  size = "md",
  ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> & { size?: "sm" | "md" }) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <select
        {...props}
        className={cn(
          "w-full appearance-none rounded-md border border-border bg-surface pr-7 pl-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 disabled:opacity-50",
          size === "sm" ? "h-7 text-md" : "h-9",
        )}
      >
        {children}
      </select>
      <CaretDown
        size={12}
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-fg-subtle"
      />
    </span>
  );
}
