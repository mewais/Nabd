import { z } from "zod";

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
  const [year = NaN, month = NaN, day = NaN] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** A day of the week, counted the way `Date.getDay()` counts it: 0 = Sunday … 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** The days of a week. */
export const DAYS_PER_WEEK = 7;

/** Whether `n` is a weekday number, 0–6. */
export const isWeekday = (n: number): n is Weekday =>
  Number.isInteger(n) && n >= 0 && n < DAYS_PER_WEEK;

/** A stored weekday number. */
export const WeekdaySchema = z.number().refine(isWeekday);

/** The weekday `d` falls on. */
export function weekdayOf(d: Date): Weekday {
  const day = d.getDay();
  if (!isWeekday(day)) throw new RangeError(`getDay() gave ${day}`);
  return day;
}

/** The Monday starting the Mon–Sun week that contains `d`. */
export function startOfWeek(d: Date): Date {
  const daysSinceMonday = (d.getDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;
  return addDays(d, -daysSinceMonday);
}

/** Minutes since local midnight. */
function minuteOfDay(d: Date): number {
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

/** The weekdays in the order a week is shown: Monday first. */
export const WEEK_ORDER: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];

/** The weekdays in the order `Date.getDay()` counts them: Sunday first. */
export const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

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

/** "Monday" for weekday 1. */
export function weekdayName(weekday: Weekday): string {
  return WEEKDAY_NAMES[weekday];
}

/** "Mon" for weekday 1. */
export function weekdayShort(weekday: Weekday): string {
  return weekdayName(weekday).slice(0, 3);
}

/** "M" for weekday 1. */
export function weekdayInitial(weekday: Weekday): string {
  return weekdayName(weekday).charAt(0);
}

/** Month names, indexed like `Date.getMonth()` (0 = January). */
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** "November" for month 10 (0 = January … 11 = December). */
export function monthName(month: number): string {
  const name = MONTH_NAMES[month];
  if (name === undefined) throw new RangeError(`month ${month} is not 0–11`);
  return name;
}

/** "Nov 9": a date's short month and day. */
export function monthAndDay(date: Date): string {
  return `${monthName(date.getMonth()).slice(0, 3)} ${date.getDate()}`;
}
