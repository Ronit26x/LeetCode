import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { TagManager } from "@/components/settings/tag-manager";
import { listTagsWithCounts } from "@/lib/problems/queries";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const tags = await listTagsWithCounts();
  return (
    <>
      <PageHeader title="Settings" description="Scheduling, tags, theme, keyboard, and data." />
      <div className="flex max-w-2xl flex-col gap-6">
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-medium">Theme</h2>
          <p className="mt-1 mb-3 text-md text-fg-muted">Dim is a warm, low-contrast palette for long sessions. System follows the OS.</p>
          <ThemeSwitch size="lg" showLabels />
        </section>
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-medium">Tags</h2>
          <p className="mt-1 mb-3 text-md text-fg-muted">Rename, recolor, merge or delete. Topics drive interleaving in the daily queue.</p>
          <TagManager tags={tags} />
        </section>
      </div>
    </>
  );
}
