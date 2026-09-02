import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { ThemeSwitch } from "@/components/theme/theme-switch";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Scheduling, tags, theme, keyboard, and data." />
      <section className="max-w-xl rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-medium">Theme</h2>
        <p className="mt-1 mb-3 text-md text-fg-muted">
          Dim is a warm, low-contrast palette for long sessions. System follows the OS.
        </p>
        <ThemeSwitch size="lg" showLabels />
      </section>
    </>
  );
}
