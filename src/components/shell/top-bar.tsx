"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { Wordmark } from "@/components/common/mark";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { Kbd } from "@/components/ui/kbd";
import { breadcrumbFor } from "@/lib/nav";
import { openCommandPalette } from "@/components/shell/command-palette";

export function TopBar() {
  const pathname = usePathname();
  const crumbs = breadcrumbFor(pathname);
  return (
    <div className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-background px-4 lg:px-6">
      <Link href="/today" className="rounded-sm lg:hidden">
        <Wordmark />
      </Link>
      <div
        className="hidden min-w-0 items-center gap-1.5 text-md text-fg-muted lg:flex"
        aria-label="Breadcrumb"
      >
        {crumbs.map((c, i) => (
          <span key={c + i} className="flex items-center gap-1.5">
            {i > 0 ? <span className="text-fg-subtle">/</span> : null}
            <span className={i === crumbs.length - 1 ? "text-foreground" : undefined}>{c}</span>
          </span>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => openCommandPalette()}
          className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-2 text-md text-fg-muted transition-colors hover:text-foreground lg:w-56 lg:justify-start"
          aria-label="Search and commands"
        >
          <MagnifyingGlass size={16} />
          <span className="hidden flex-1 text-left lg:inline">Search</span>
          <Kbd className="hidden lg:inline-flex">⌘K</Kbd>
        </button>
        <ThemeSwitch />
      </div>
    </div>
  );
}
