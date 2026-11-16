// How the planner names the parts of a plan.

import type { Day, ProgramType } from "@nabd/domain";
import { plural } from "@nabd/domain";

/** "Day 2" for the second day of a floating plan. */
export const dayOrdinal = (index: number): string => `Day ${index + 1}`;

/** "5 exercises · 16 sets" (fixed) / "4 muscles · 12 sets" (cycled). */
export function daySummary(day: Day, type: ProgramType): string {
  const rows = type === "cycled" ? day.slots : day.exercises;
  const sets = rows.reduce((n, row) => n + row.sets.length, 0);
  return `${plural(rows.length, type === "cycled" ? "muscle" : "exercise")} · ${plural(sets, "set")}`;
}
