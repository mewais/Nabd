// How the planner names the parts of a plan.

import type { Day, Prescription, ProgramType } from "@nabd/domain";
import { plural, sum } from "@nabd/domain";

/** "Day 2" for the second day of a floating plan. */
export const dayOrdinal = (index: number): string => `Day ${index + 1}`;

/** "5 exercises · 16 sets" (fixed) / "4 muscles · 12 sets" (cycled). */
export function daySummary(day: Day, type: ProgramType): string {
  const rows: readonly Prescription[] = type === "cycled" ? day.slots : day.exercises;
  const sets = sum(rows, (row) => row.sets.length);
  return `${plural(rows.length, type === "cycled" ? "muscle" : "exercise")} · ${plural(sets, "set")}`;
}
