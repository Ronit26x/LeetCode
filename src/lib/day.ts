import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

const DAY_MS = 86_400_000;

/** Wall-clock parts of `instant` in `tz`. */
function wallParts(instant: Date, tz: string) {
  const z = toZonedTime(instant, tz);
  return {
    y: z.getFullYear(),
    m: z.getMonth(),
    d: z.getDate(),
    h: z.getHours(),
    min: z.getMinutes(),
  };
}

/** The instant of `hour`:00 on the wall-clock date (y, m, d) in `tz`. Handles DST via fromZonedTime. */
function atHour(y: number, m: number, d: number, hour: number, tz: string): Date {
  return fromZonedTime(new Date(y, m, d, hour, 0, 0, 0), tz);
}

/** The most recent `dayStartHour`:00 in `tz` that is <= now. Between midnight and that hour it is still yesterday's review day. */
export function dayStart(now: Date, tz: string, dayStartHour: number): Date {
  const { y, m, d } = wallParts(now, tz);
  const today = atHour(y, m, d, dayStartHour, tz);
  if (today.getTime() <= now.getTime()) return today;
  return atHour(y, m, d - 1, dayStartHour, tz);
}

/** The next `dayStartHour`:00 after `dayStart(now)`. */
export function dayEnd(now: Date, tz: string, dayStartHour: number): Date {
  const start = dayStart(now, tz, dayStartHour);
  const { y, m, d } = wallParts(start, tz);
  return atHour(y, m, d + 1, dayStartHour, tz);
}

/** YYYY-MM-DD of the review day containing `now`, in `tz`. */
export function reviewDayKey(now: Date, tz: string, dayStartHour: number): string {
  return formatInTimeZone(dayStart(now, tz, dayStartHour), tz, "yyyy-MM-dd");
}

/** The calendar date (YYYY-MM-DD) of an instant in `tz`, ignoring the day-start hour. */
export function calendarDayKey(instant: Date, tz: string): string {
  return formatInTimeZone(instant, tz, "yyyy-MM-dd");
}

/** Start of a calendar date (midnight) in `tz`, for a YYYY-MM-DD string. */
export function startOfCalendarDay(dayKey: string, tz: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  return atHour(y, m - 1, d, 0, tz);
}

/** Fractional days from `a` to `b`. */
export function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / DAY_MS;
}

/** Whole review days from the review day of `now` to the review day of `date` (negative if past). */
export function reviewDaysUntil(now: Date, date: Date, tz: string, dayStartHour: number): number {
  const a = dayStart(now, tz, dayStartHour).getTime();
  const b = dayStart(date, tz, dayStartHour).getTime();
  return Math.round((b - a) / DAY_MS);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}
