"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, ChartBar, GearSix, Stack, Tray } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, activeNavKey, type NavKey } from "@/lib/nav";
import { Wordmark } from "@/components/common/mark";

export const NAV_ICONS: Record<NavKey, Icon> = {
  today: CalendarCheck,
  backlog: Tray,
  problems: Stack,
  stats: ChartBar,
  settings: GearSix,
};

export function Sidebar({
  counts,
  footer,
}: {
  counts?: Partial<Record<NavKey, number>>;
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = activeNavKey(pathname);
  return (
    <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-border bg-background lg:flex">
      <div className="flex h-12 items-center px-4">
        <Link href="/today" className="rounded-sm focus-visible:outline-2">
          <Wordmark />
        </Link>
      </div>
      <nav aria-label="Primary" className="mt-2 flex flex-col gap-px px-2">
        {NAV_ITEMS.map((item) => {
          const IconComp = NAV_ICONS[item.key];
          const isActive = active === item.key;
          const count = counts?.[item.key];
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-2.5 rounded-md px-2 text-sm text-fg-muted transition-colors duration-150",
                "hover:bg-hover hover:text-foreground",
                isActive && "bg-hover font-medium text-foreground",
              )}
            >
              <IconComp size={18} weight={isActive ? "fill" : "regular"} className="shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {typeof count === "number" && count > 0 ? (
                <span className="text-xs text-fg-subtle">{count}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-3 p-3">{footer}</div>
    </aside>
  );
}
