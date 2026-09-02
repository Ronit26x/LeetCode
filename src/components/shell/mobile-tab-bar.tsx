"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, activeNavKey } from "@/lib/nav";
import { NAV_ICONS } from "@/components/shell/sidebar";

export function MobileTabBar({ hidden }: { hidden?: boolean }) {
  const pathname = usePathname();
  const active = activeNavKey(pathname);
  // The session owns the whole phone screen; Esc or the close button leave it.
  if (hidden || pathname.startsWith("/review")) return null;
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-safe lg:hidden"
    >
      <ul className="grid h-14 grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const IconComp = NAV_ICONS[item.key];
          const isActive = active === item.key;
          return (
            <li key={item.key} className="min-w-0">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-fg-subtle transition-colors",
                  isActive && "text-foreground",
                )}
              >
                <IconComp size={22} weight={isActive ? "fill" : "regular"} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
