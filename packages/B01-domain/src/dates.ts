/**
 * Local-time date helpers. Every "which day is it" decision in the app goes
 * through here so a day always means the user's calendar day, never UTC.
 */

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Local calendar-day key, `YYYY-MM-DD`. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Local midnight at the start of `d`'s day. */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** `d` shifted by whole calendar days (DST-safe), at local midnight. */
export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** Parse a `YYYY-MM-DD` key back to local midnight. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

/** The Monday starting the Mon–Sun week that contains `d`. */
export function startOfWeek(d: Date): Date {
  const daysSinceMonday = (d.getDay() + 6) % 7;
  return addDays(d, -daysSinceMonday);
}

/** Minutes since local midnight. */
export function minuteOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** `d`'s day at the given minute-of-day. */
export function atMinuteOfDay(d: Date, minute: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, minute);
}

/** "HH:MM" (24h) for a minute-of-day. */
export function formatMinuteOfDay(minute: number): string {
  return `${pad2(Math.floor(minute / 60))}:${pad2(minute % 60)}`;
}

/** "HH:MM" (24h) wall-clock time. */
export function formatClock(d: Date): string {
  return formatMinuteOfDay(minuteOfDay(d));
}

/** Weekday names, indexed like `Date.getDay()` (0 = Sunday). */
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** "Monday" for weekday 1 (0 = Sunday … 6 = Saturday). */
export function weekdayName(weekday: number): string {
  const name = WEEKDAY_NAMES[weekday];
  if (name === undefined) throw new RangeError(`weekday ${weekday} is not 0–6`);
  return name;
}

/** "Mon" for weekday 1. */
export function weekdayShort(weekday: number): string {
  return weekdayName(weekday).slice(0, 3);
}

/** "M" for weekday 1. */
export function weekdayInitial(weekday: number): string {
  return weekdayName(weekday).charAt(0);
}
