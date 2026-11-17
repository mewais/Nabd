// How the planner names the parts of a plan.

import type { Day, Prescription, ProgramType } from "@nabd/domain";
import { plural, sum } from "@nabd/domain";

/** What the planner's components say. */
export const WORDS = {
  program: "Program",
  programName: "Program name",
  planType: "Plan type",
  schedule: "Schedule",
  days: "Days",
  addDay: "Add day",
  addAnotherDay: "+ Add day",
  restDay: "Rest",
  dayEditor: "Day editor",
  dayName: "Day name",
  weekday: "Weekday",
  addExercise: "+ Add exercise",
  removeExercise: "Remove exercise",
  addMuscle: "+ Add muscle",
  addMuscleGroup: "Add muscle",
  removeSlot: "Remove slot",
  prescription: "Prescription",
  prescriptionHint: "Applies to whichever exercise rotates in",
  moveEarlier: "Move earlier",
  moveLater: "Move later",
  superset: "Superset",
  supersetHint: "Moves as one. Move an exercise past its edge to unlink it.",
  linkSuperset: "Superset ↓",
  unlink: "Unlink",
  repMode: "Rep mode",
  load: "Load",
  loadMode: "Load mode",
  rest: "Rest",
  set: "Set",
  addSet: "+ Add set",
  addWarmup: "+ Warmup",
  note: "Note",
  notePlaceholder: "Add a note (cues, setup, tempo…)",
  coverage: "Weekly coverage",
  coverageHint: "Sets per muscle across the plan",
} as const;

/** "Day 2" for the second day of a floating plan. */
export const dayOrdinal = (index: number): string => `Day ${index + 1}`;

/** "5 exercises · 16 sets" (fixed) / "4 muscles · 12 sets" (cycled). */
export function daySummary(day: Day, type: ProgramType): string {
  const rows: readonly Prescription[] = type === "cycled" ? day.slots : day.exercises;
  const sets = sum(rows, (row) => row.sets.length);
  return `${plural(rows.length, type === "cycled" ? "muscle" : "exercise")} · ${plural(sets, "set")}`;
}
