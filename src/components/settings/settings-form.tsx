"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/common/native-select";
import { inputClass } from "@/components/common/field";
import { updateSettings } from "@/lib/settings/actions";
import type { Settings } from "@/db/schema";
import type { SettingsPatch } from "@/lib/validation";
import { cn } from "@/lib/utils";

function Row({ label, hint, htmlFor, children }: { label: string; hint?: React.ReactNode; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
      <div>
        <label htmlFor={htmlFor} className="text-sm text-foreground">
          {label}
        </label>
        {hint ? <p className="mt-0.5 text-2xs text-fg-subtle">{hint}</p> : null}
      </div>
      <div className="flex items-center gap-2 sm:justify-end">{children}</div>
    </div>
  );
}

function NumberField({
  id,
  value,
  onCommit,
  min,
  max,
  step = 1,
  suffix,
  width = "w-24",
  allowEmpty,
}: {
  id: string;
  value: number | null;
  onCommit: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  width?: string;
  allowEmpty?: boolean;
}) {
  const [text, setText] = React.useState(value === null ? "" : String(value));
  React.useEffect(() => {
    const t = setTimeout(() => setText(value === null ? "" : String(value)), 0);
    return () => clearTimeout(t);
  }, [value]);
  function commit() {
    if (text.trim() === "") {
      if (allowEmpty) onCommit(null);
      else setText(value === null ? "" : String(value));
      return;
    }
    const n = Number(text);
    if (!Number.isFinite(n)) {
      setText(value === null ? "" : String(value));
      return;
    }
    if (n !== value) onCommit(n);
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        id={id}
        inputMode="decimal"
        value={text}
        min={min}
        max={max}
        step={step}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className={cn(inputClass, "h-8 text-right text-md", width)}
      />
      {suffix ? <span className="text-2xs text-fg-subtle">{suffix}</span> : null}
    </span>
  );
}

const HOURS = Array.from({ length: 24 }, (_, h) => ({ value: h, label: `${((h + 11) % 12) + 1}:00 ${h < 12 ? "AM" : "PM"}` }));

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [tzList, setTzList] = React.useState<string[]>([]);
  const [tz, setTz] = React.useState(settings.timezone);
  const [milestones, setMilestones] = React.useState(settings.resolveMilestonesDays.join(", "));

  React.useEffect(() => {
    const t = setTimeout(() => {
      try {
        setTzList(Intl.supportedValuesOf("timeZone"));
      } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, []);

  function save(patch: SettingsPatch, label?: string) {
    updateSettings(patch).then((res) => {
      if (!res.ok) {
        toast.error(res.error);
        router.refresh();
        return;
      }
      if (label) toast.success(label);
      router.refresh();
    });
  }

  const targets = settings.resolveTimeTargetsMin;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-surface px-5 py-2">
        <h2 className="pt-3 text-sm font-medium">Schedule</h2>
        <div className="divide-y divide-border">
          <Row label="Time zone" hint="Review days and the heatmap follow this zone." htmlFor="tz">
            <input
              id="tz"
              list="tz-list"
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              onBlur={() => tz !== settings.timezone && save({ timezone: tz })}
              className={cn(inputClass, "h-8 w-56 text-md")}
            />
            <datalist id="tz-list">
              {tzList.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
          </Row>
          <Row label="Day starts at" hint="Before this hour it is still yesterday's review day, like Anki." htmlFor="dayStart">
            <NativeSelect id="dayStart" size="sm" value={settings.dayStartHour} onChange={(e) => save({ dayStartHour: Number(e.target.value) })} className="w-28">
              {HOURS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </NativeSelect>
          </Row>
          <Row label="Desired retention" hint="0.90 is the default. Workload rises steeply above 0.95." htmlFor="retention">
            <NumberField id="retention" value={settings.desiredRetention} min={0.8} max={0.97} step={0.01} onCommit={(v) => v !== null && save({ desiredRetention: v })} />
          </Row>
          <Row label="Maximum interval" htmlFor="maxIvl">
            <NumberField id="maxIvl" value={settings.maximumInterval} min={1} max={36500} suffix="days" onCommit={(v) => v !== null && save({ maximumInterval: v })} />
          </Row>
          <Row label="Daily soft cap" hint="Hides the tail of Today behind Show more. Overdue cards are never hidden. Empty means unlimited." htmlFor="cap">
            <NumberField id="cap" value={settings.dailySoftCap} min={1} max={1000} allowEmpty suffix="cards" onCommit={(v) => save({ dailySoftCap: v })} />
          </Row>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface px-5 py-2">
        <h2 className="pt-3 text-sm font-medium">Interview</h2>
        <div className="divide-y divide-border">
          <Row label="Interview date" hint="Drives the readiness panel, the retention ramp and the cram window. Clear it after the interview." htmlFor="interview">
            <input
              id="interview"
              type="date"
              value={settings.interviewDate ?? ""}
              onChange={(e) => save({ interviewDate: e.target.value || null })}
              className={cn(inputClass, "h-8 w-40 text-md")}
            />
          </Row>
          <Row label="Retention ramp" hint="Raise desired retention linearly over the final days before the interview." htmlFor="ramp">
            <Switch id="ramp" checked={settings.retentionRampEnabled} onCheckedChange={(v) => save({ retentionRampEnabled: v })} />
          </Row>
          <Row label="Ramp length" htmlFor="rampDays">
            <NumberField id="rampDays" value={settings.retentionRampDays} min={1} max={90} suffix="days" onCommit={(v) => v !== null && save({ retentionRampDays: v })} />
          </Row>
          <Row label="Ramp target" hint="Retention on interview day." htmlFor="rampTarget">
            <NumberField id="rampTarget" value={settings.retentionRampTarget} min={0.8} max={0.97} step={0.01} onCommit={(v) => v !== null && save({ retentionRampTarget: v })} />
          </Row>
          <Row label="Cram window" hint="Inside this window Today shows not-yet-due cards with the lowest predicted recall, separately." htmlFor="cram">
            <NumberField id="cram" value={settings.cramWindowDays} min={0} max={90} suffix="days" onCommit={(v) => v !== null && save({ cramWindowDays: v })} />
          </Row>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface px-5 py-2">
        <h2 className="pt-3 text-sm font-medium">Revise and Resolve</h2>
        <div className="divide-y divide-border">
          <Row label="Allow Easy in Revise" hint="Off by default: Easy is earned by resolving." htmlFor="easy">
            <Switch id="easy" checked={settings.allowEasyInRevise} onCheckedChange={(v) => save({ allowEasyInRevise: v })} />
          </Row>
          <Row label="Resolve milestones" hint="Suggest a cold re-solve when stability first crosses each of these." htmlFor="milestones">
            <input
              id="milestones"
              value={milestones}
              onChange={(e) => setMilestones(e.target.value)}
              onBlur={() => {
                const parsed = milestones
                  .split(/[,\s]+/)
                  .map((s) => Number.parseInt(s, 10))
                  .filter((n) => Number.isFinite(n) && n > 0);
                const unique = [...new Set(parsed)].sort((a, b) => a - b);
                setMilestones(unique.join(", "));
                if (unique.join() !== settings.resolveMilestonesDays.join()) save({ resolveMilestonesDays: unique });
              }}
              className={cn(inputClass, "h-8 w-40 text-md")}
            />
            <span className="text-2xs text-fg-subtle">days</span>
          </Row>
          <Row label="Resolve after" hint="Consecutive revises before a resolve is suggested. 0 turns this rule off." htmlFor="afterN">
            <NumberField id="afterN" value={settings.resolveAfterNRevises} min={0} max={50} suffix="revises" onCommit={(v) => v !== null && save({ resolveAfterNRevises: v })} />
          </Row>
          <Row label="Resolve time targets" hint="Timer presets and the time estimate on Today." htmlFor="tEasy">
            <div className="flex items-center gap-2">
              {(["easy", "medium", "hard"] as const).map((d) => (
                <label key={d} className="flex items-center gap-1 text-2xs text-fg-subtle">
                  <span className="capitalize">{d}</span>
                  <NumberField id={`t${d}`} value={targets[d]} min={1} max={240} width="w-16" onCommit={(v) => v !== null && save({ resolveTimeTargetsMin: { ...targets, [d]: v } })} />
                </label>
              ))}
              <span className="text-2xs text-fg-subtle">min</span>
            </div>
          </Row>
          <Row label="Revise estimate" hint="Minutes per revise, for the Today estimate." htmlFor="revEst">
            <NumberField id="revEst" value={settings.reviseTimeEstimateMin} min={1} max={120} suffix="min" onCommit={(v) => v !== null && save({ reviseTimeEstimateMin: v })} />
          </Row>
        </div>
      </section>
    </div>
  );
}
