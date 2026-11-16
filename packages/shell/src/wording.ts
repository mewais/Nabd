// How the shell words the moment and the app itself.

import { monthAndDay, weekdayName, weekdayOf } from "@nabd/domain";

/** What the shell's components say. */
export const WORDS = {
  dismiss: "Dismiss",
  glass: "Glass",
} as const;

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
  const weekday = weekdayName(weekdayOf(now)).toUpperCase();
  return `${weekday} · ${monthAndDay(now)}`;
}

/** What the app's name means, shown under it. */
const TAGLINE = "PULSE";

/** The tagline and the version, "PULSE · v0.1" for version "0.1.0": the patch number is left out. */
export function versionLabel(version: string): string {
  const [major, minor] = version.split(".");
  return `${TAGLINE} · v${major}.${minor}`;
}
