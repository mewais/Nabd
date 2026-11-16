// How the Progress screen words hours, days and the absence of sets.

import { monthShort } from "@nabd/domain";

/** The opening of every "nothing yet" note about logged sets. */
export const NOTHING_LOGGED = "No sets logged yet.";

/** "9a", "12p", "6p". */
export function hourLabel(hour: number): string {
  return `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? "a" : "p"}`;
}

/** "Nov 9". */
export const monthAndDay = (date: Date): string =>
  `${monthShort(date.getMonth())} ${date.getDate()}`;
