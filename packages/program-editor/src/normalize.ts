// The rules a program always obeys, whatever was stored or imported: every
// edit ends by applying them, and so does loading.

import type { Day, ExerciseLookup, Measure, Program } from "@nabd/domain";
import { measureOf, poolMeasure } from "@nabd/domain";
import { PrescriptionEditor } from "./prescription-editor";

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
  day.exercises = day.exercises.map((row) => {
    const measure = measureOfExercise(row.exId);
    return measure === null ? row : new PrescriptionEditor(row).countIn(measure);
  });
  day.slots = day.slots.map((slot) => {
    const measure = poolMeasure(slot.pool, lookup);
    if (measure === null) return slot;
    const pool = slot.pool.filter((exId) => (measureOfExercise(exId) ?? measure) === measure);
    return new PrescriptionEditor({ ...slot, pool }).countIn(measure);
  });
}

/** An RPE or a %1RM is only ever a value of its scale (a stored "RPE 50" is RPE 10). */
function keepIntensitiesOnScale(day: Day): void {
  day.exercises = day.exercises.map((row) => new PrescriptionEditor(row).keepIntensitiesOnScale());
  day.slots = day.slots.map((slot) => new PrescriptionEditor(slot).keepIntensitiesOnScale());
}

/** Apply the rules to `program`, in place. */
export function normalize(program: Program, lookup: ExerciseLookup): void {
  for (const day of program.days) {
    gatherSupersets(day);
    alignMeasures(day, lookup);
    keepIntensitiesOnScale(day);
  }
}

/** `program` obeying the rules: itself when it already does, else a corrected copy. */
export function normalized(program: Program, lookup: ExerciseLookup): Program {
  const draft = structuredClone(program);
  normalize(draft, lookup);
  return JSON.stringify(draft) === JSON.stringify(program) ? program : draft;
}
