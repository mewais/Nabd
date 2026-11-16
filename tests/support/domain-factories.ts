// Small builders for domain objects used across the engine test suites.

import type {
  Exercise,
  ExercisePrescription,
  LoggedSet,
  Prescription,
  SetSpec,
} from "@nabd/domain";
import { dateKey } from "@nabd/domain";

let nextId = 0;
const uid = (prefix: string): string => `${prefix}-${++nextId}`;

/** A local-time date in November 2026 (the 16th is a Monday). */
export const nov = (day: number, hour = 12, minute = 0): Date =>
  new Date(2026, 10, day, hour, minute);

export function exercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: uid("ex"),
    name: "Test Press",
    group: "Chest",
    primary: ["chest"],
    secondary: ["triceps"],
    equipment: "dumbbell",
    tracking: "weight_reps",
    ...overrides,
  };
}

export const working = (a: number, b?: number): SetSpec =>
  b === undefined ? { type: "working", a } : { type: "working", a, b };

export function prescription(sets: SetSpec[], overrides: Partial<Prescription> = {}): Prescription {
  return { repMode: "range", intensity: "none", rest: 90, sets, ...overrides };
}

export function row(exId: string, sets: SetSpec[], overrides: Partial<ExercisePrescription> = {}) {
  return {
    id: uid("row"),
    exId,
    ...prescription(sets),
    ...overrides,
  } satisfies ExercisePrescription;
}

/** A logged set of `ex` at `at`, defaulting to an unplanned working set. */
export function logged(
  ex: Exercise,
  at: Date,
  reps: number,
  weight: number | null,
  overrides: Partial<LoggedSet> = {},
): LoggedSet {
  return {
    id: uid("set"),
    exId: ex.id,
    exercise: ex.name,
    group: ex.group,
    muscles: [...ex.primary, ...ex.secondary],
    value: reps,
    weight,
    ts: at.toISOString(),
    date: dateKey(at),
    trigger: "manual",
    planItemId: null,
    setType: "working",
    ...overrides,
  };
}
