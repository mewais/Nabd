// The wall clock the specs run on. Every spec installs a fake clock at one of
// these moments before the page loads, so "now" is whatever the spec says.

/**
 * The browser's time zone (see playwright.config.ts). Deliberately not UTC, so
 * code that mistook a UTC day for the user's calendar day would fail here.
 */
export const TIME_ZONE = "America/Toronto";

/** {@link TIME_ZONE}'s offset on every date the specs use (after the autumn clock change). */
const UTC_OFFSET = "-05:00";

/** A Monday, so a spec's week starts with its first day. */
export const MONDAY = "2026-11-16";

/** The date key `days` after `day` ("2026-11-16", 2 → "2026-11-18"). */
export function dayAfter(day: string, days = 1): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The moment it is `time` ("HH:MM") on `day` (a date key) in the browser's time zone. */
export function at(time: string, day: string = MONDAY): Date {
  return new Date(`${day}T${time}:00${UTC_OFFSET}`);
}
