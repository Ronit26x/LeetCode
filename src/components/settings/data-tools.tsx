"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DownloadSimple, UploadSimple } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { exportAll, importApply, importPreview } from "@/lib/data/actions";
import type { ImportPreview } from "@/lib/data/core";

export function DataTools() {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [file, setFile] = React.useState<{ name: string; text: string } | null>(null);
  const [preview, setPreview] = React.useState<ImportPreview | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function download() {
    start(async () => {
      const res = await exportAll();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const blob = new Blob([res.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recur-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setFile({ name: f.name, text });
    setPreview(null);
    start(async () => {
      const res = await importPreview(text);
      if (!res.ok) {
        toast.error(res.error);
        setFile(null);
        return;
      }
      setPreview(res.data);
    });
  }

  function apply() {
    if (!file) return;
    start(async () => {
      const res = await importApply(file.text);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Imported: ${res.data.problems.create} new, ${res.data.problems.update} updated, ${res.data.logs.create} new logs`);
      setFile(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={download} disabled={pending}>
          <DownloadSimple size={16} />
          Export JSON
        </Button>
        <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={pending}>
          <UploadSimple size={16} />
          Import JSON
        </Button>
        <input ref={inputRef} type="file" accept="application/json,.json" onChange={pick} className="sr-only" aria-label="Choose an export file" />
      </div>
      <p className="text-2xs text-fg-subtle">Everything: problems, snippets, tags, cards, review logs, settings. Import is a dry run first, then idempotent by slug, tag name and review id.</p>
      {file && preview ? (
        <div className="rounded-md border border-border bg-sunken/50 p-3 text-md">
          <p className="font-medium">{file.name}</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-2xs sm:grid-cols-3">
            <div className="flex justify-between"><dt className="text-fg-subtle">New problems</dt><dd>{preview.problems.create}</dd></div>
            <div className="flex justify-between"><dt className="text-fg-subtle">Updated problems</dt><dd>{preview.problems.update}</dd></div>
            <div className="flex justify-between"><dt className="text-fg-subtle">Cards</dt><dd>{preview.cards}</dd></div>
            <div className="flex justify-between"><dt className="text-fg-subtle">New logs</dt><dd>{preview.logs.create}</dd></div>
            <div className="flex justify-between"><dt className="text-fg-subtle">Logs already present</dt><dd>{preview.logs.skip}</dd></div>
            <div className="flex justify-between"><dt className="text-fg-subtle">New tags</dt><dd>{preview.tags.create}</dd></div>
            <div className="flex justify-between"><dt className="text-fg-subtle">Snippets</dt><dd>{preview.snippets}</dd></div>
            <div className="flex justify-between"><dt className="text-fg-subtle">Relations</dt><dd>{preview.relations}</dd></div>
            <div className="flex justify-between"><dt className="text-fg-subtle">Settings</dt><dd>{preview.settings ? "yes" : "no"}</dd></div>
          </dl>
          {preview.warnings.length ? (
            <ul className="mt-2 list-disc pl-4 text-2xs text-hard">
              {preview.warnings.slice(0, 8).map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={apply} disabled={pending}>
              Apply import
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setFile(null);
                setPreview(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
