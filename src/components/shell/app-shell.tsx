import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { MobileTabBar } from "@/components/shell/mobile-tab-bar";
import { CommandPalette } from "@/components/shell/command-palette";
import { GlobalHotkeys } from "@/components/shell/global-hotkeys";
import type { NavKey } from "@/lib/nav";

export function AppShell({
  children,
  counts,
  sidebarFooter,
}: {
  children: React.ReactNode;
  counts?: Partial<Record<NavKey, number>>;
  sidebarFooter?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar counts={counts} footer={sidebarFooter} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="main" className="flex-1 px-4 pt-6 pb-24 lg:px-8 lg:pb-12">
          <div className="mx-auto w-full max-w-[1120px]">{children}</div>
        </main>
      </div>
      <MobileTabBar />
      <CommandPalette />
      <GlobalHotkeys />
    </div>
  );
}
