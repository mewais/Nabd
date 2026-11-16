import { monthShort, weekdayName } from "@nabd/domain";

const NOON = 12;
const EVENING = 18;

/** "Good morning", "Good afternoon" or "Good evening" for the time of day. */
export function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < NOON) return "Good morning";
  if (hour < EVENING) return "Good afternoon";
  return "Good evening";
}

/** "MONDAY · Nov 16". */
export function dateLabel(now: Date): string {
  const weekday = weekdayName(now.getDay()).toUpperCase();
  return `${weekday} · ${monthShort(now.getMonth())} ${now.getDate()}`;
}

/** "PULSE · v0.1" for version "0.1.0": the patch number is left out. */
export function versionLabel(version: string): string {
  const [major, minor] = version.split(".");
  return `PULSE · v${major}.${minor}`;
}
