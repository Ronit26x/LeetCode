import { formatInTimeZone } from "date-fns-tz";
import type { Difficulty, ReviewMode } from "@/db/schema";

export function formatInterval(days: number): string {
  if (!Number.isFinite(days)) return "";
  if (days < 1) return "<1d";
  if (days < 30) return `${Math.round(days)}d`;
  if (days < 365) {
    const months = days / 30.4;
    return `${months < 10 ? months.toFixed(1).replace(/\.0$/, "") : Math.round(months)}mo`;
  }
  const years = days / 365;
  return `${years.toFixed(1).replace(/\.0$/, "")}y`;
}

export function formatPercent(r: number | null | undefined, digits = 0): string {
  if (r === null || r === undefined || !Number.isFinite(r)) return "–";
  return `${(r * 100).toFixed(digits)}%`;
}

export function formatStability(s: number): string {
  if (s <= 0) return "–";
  if (s < 10) return `${s.toFixed(1)}d`;
  return formatInterval(s);
}

export function formatDate(date: Date | string | null | undefined, tz: string, pattern = "MMM d"): string {
  if (!date) return "–";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, tz, pattern);
}

export function formatDateTime(date: Date | null | undefined, tz: string): string {
  return formatDate(date, tz, "MMM d, h:mm a");
}

/** "3d overdue", "today", "tomorrow", "in 6d", relative to whole review days. */
export function formatDueRelative(daysUntil: number): string {
  if (daysUntil < 0) return `${-daysUntil}d overdue`;
  if (daysUntil === 0) return "today";
  if (daysUntil === 1) return "tomorrow";
  return `in ${formatInterval(daysUntil)}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "–";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const MODE_LABEL: Record<ReviewMode, string> = {
  revise: "Revise",
  resolve: "Resolve",
};

export const RATING_LABEL: Record<number, string> = {
  0: "Reset",
  1: "Again",
  2: "Hard",
  3: "Good",
  4: "Easy",
};

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
