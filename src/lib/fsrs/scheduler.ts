import type { Settings } from "@/db/schema";
import { calendarDayKey, startOfCalendarDay } from "@/lib/day";
import { buildFsrs, buildFsrsNoFuzz, effectiveRetention, type FSRS } from "./core";

const DAY_MS = 86_400_000;

/** Calendar days from today (in the settings timezone) to the interview date; null when unset. */
export function daysUntilInterview(settings: Pick<Settings, "interviewDate" | "timezone">, now: Date): number | null {
  if (!settings.interviewDate) return null;
  const today = startOfCalendarDay(calendarDayKey(now, settings.timezone), settings.timezone);
  const interview = startOfCalendarDay(settings.interviewDate, settings.timezone);
  return Math.round((interview.getTime() - today.getTime()) / DAY_MS);
}

export function interviewIsUpcoming(settings: Pick<Settings, "interviewDate" | "timezone">, now: Date): boolean {
  const d = daysUntilInterview(settings, now);
  return d !== null && d >= 0;
}

export interface Scheduler {
  f: FSRS;
  /** Same parameters with fuzz off, for idempotent rescheduling passes. */
  fNoFuzz: FSRS;
  retention: number;
  daysUntilInterview: number | null;
  interviewDate: Date | null;
}

/** One instance per request, with the retention ramp applied for today. */
export function schedulerForNow(settings: Settings, now: Date): Scheduler {
  const d = daysUntilInterview(settings, now);
  const retention = effectiveRetention(settings, d);
  return {
    f: buildFsrs(settings, retention),
    fNoFuzz: buildFsrsNoFuzz(settings, retention),
    retention,
    daysUntilInterview: d,
    interviewDate: settings.interviewDate ? startOfCalendarDay(settings.interviewDate, settings.timezone) : null,
  };
}
