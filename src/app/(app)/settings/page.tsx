import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { ThemeSwitch } from "@/components/theme/theme-switch";
import { TagManager } from "@/components/settings/tag-manager";
import { SettingsForm } from "@/components/settings/settings-form";
import { FsrsParams } from "@/components/settings/fsrs-params";
import { DataTools } from "@/components/settings/data-tools";
import { KEYS, RUBRIC } from "@/lib/rubric";
import { listTagsWithCounts } from "@/lib/problems/queries";
import { getSettings } from "@/db/bootstrap";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [tags, settings] = await Promise.all([listTagsWithCounts(), getSettings()]);
  return (
    <>
      <PageHeader title="Settings" description="Scheduling, the interview, modes, tags, theme, keyboard, and data." />
      <div className="flex max-w-2xl flex-col gap-6">
        <SettingsForm settings={settings} />

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-medium">FSRS parameters</h2>
          <div className="mt-2">
            <FsrsParams weights={settings.fsrsParams} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-medium">Tags</h2>
          <p className="mt-1 mb-3 text-md text-fg-muted">Rename, recolor, merge or delete. Topics drive interleaving in the daily queue.</p>
          <TagManager tags={tags} />
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-medium">Theme</h2>
          <p className="mt-1 mb-3 text-md text-fg-muted">Dim is a warm, low-contrast palette for long sessions. System follows the OS.</p>
          <ThemeSwitch size="lg" showLabels />
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-medium">Keyboard</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-md">
            {KEYS.map(([k, v]) => (
              <div key={k} className="contents">
                <dt>
                  <kbd className="rounded-[3px] border border-border bg-sunken px-1.5 font-sans text-2xs font-medium">{k}</kbd>
                </dt>
                <dd className="text-fg-muted">{v}</dd>
              </div>
            ))}
            <div className="contents">
              <dt>
                <kbd className="rounded-[3px] border border-border bg-sunken px-1.5 font-sans text-2xs font-medium">⌘K</kbd>
              </dt>
              <dd className="text-fg-muted">Jump to a problem, page or action, anywhere</dd>
            </div>
            <div className="contents">
              <dt>
                <kbd className="rounded-[3px] border border-border bg-sunken px-1.5 font-sans text-2xs font-medium">⌘↵</kbd>
              </dt>
              <dd className="text-fg-muted">Save the problem form</dd>
            </div>
          </dl>
          <h3 className="mt-5 text-md font-medium">Rubric</h3>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            {(["revise", "resolve"] as const).map((mode) => (
              <div key={mode}>
                <p className="text-2xs font-medium text-fg-subtle capitalize">{mode}</p>
                <ul className="mt-1 flex flex-col gap-1 text-2xs text-fg-muted">
                  {([1, 2, 3, 4] as const).map((r) => (
                    <li key={r}>
                      <span className="font-medium text-foreground">{["", "Again", "Hard", "Good", "Easy"][r]}</span>: {RUBRIC[mode][r]}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-medium">Data</h2>
          <div className="mt-2">
            <DataTools />
          </div>
        </section>
      </div>
    </>
  );
}
