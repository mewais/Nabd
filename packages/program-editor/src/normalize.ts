// The rules a program always obeys, whatever was stored or imported: every
// edit ends by applying them, and so does loading.

import type { Day, ExerciseLookup, Measure, Program } from "@nabd/domain";
import { measureOf, poolMeasure } from "@nabd/domain";
import { setMeasure } from "./prescription-edits";

/**
 * Keep supersets together: the members of each superset follow its first
 * member, and a superset left with a single member is no superset.
 */
function gatherSupersets(day: Day): void {
  const rows: Day["exercises"] = [];
  for (const row of day.exercises) {
    if (rows.includes(row)) continue;
    const members =
      row.supersetId === undefined
        ? [row]
        : day.exercises.filter((other) => other.supersetId === row.supersetId);
    if (members.length === 1) delete row.supersetId;
    rows.push(...members);
  }
  day.exercises = rows;
}

/**
 * Seconds or reps is a property of the exercise, not of the plan. A row is
 * prescribed in its exercise's measure. A cycled pool shares one prescription,
 * so it holds one kind of exercise — the kind of its first — and its slot is
 * prescribed in that measure. Exercises the library does not know are left alone.
 */
function alignMeasures(day: Day, lookup: ExerciseLookup): void {
  const measureOfExercise = (exId: string): Measure | null => {
    const exercise = lookup(exId);
    return exercise ? measureOf(exercise.tracking) : null;
  };
  for (const row of day.exercises) {
    const measure = measureOfExercise(row.exId);
    if (measure !== null) setMeasure(row, measure);
  }
  for (const slot of day.slots) {
    const measure = poolMeasure(slot.pool, lookup);
    if (measure === null) continue;
    slot.pool = slot.pool.filter((exId) => (measureOfExercise(exId) ?? measure) === measure);
    setMeasure(slot, measure);
  }
}

/** Apply the rules to `program`, in place. */
export function normalize(program: Program, lookup: ExerciseLookup): void {
  for (const day of program.days) {
    gatherSupersets(day);
    alignMeasures(day, lookup);
  }
}

/** `program` obeying the rules: itself when it already does, else a corrected copy. */
export function normalized(program: Program, lookup: ExerciseLookup): Program {
  const draft = structuredClone(program);
  normalize(draft, lookup);
  return JSON.stringify(draft) === JSON.stringify(program) ? program : draft;
}
