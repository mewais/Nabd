// Small builders for domain objects, shared by every test suite: dates,
// exercises, prescribed sets and rows, logged sets, day records.

import type {
  CarriedItem,
  CarriedItems,
  CarriedVisit,
  DayRecord,
  Exercise,
  ExerciseLookup,
  ExercisePrescription,
  LoggedSet,
  Prescription,
  SetCounts,
  SetSpec,
} from "@nabd/domain";
import { NO_SETS, dateKey, loggedSet } from "@nabd/domain";

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

/** Looks exercises up among the given ones, the way a library would. */
export const lookupIn =
  (exercises: readonly Exercise[]): ExerciseLookup =>
  (exId) =>
    exercises.find((e) => e.id === exId);

/** A working set of `lo` reps (or seconds), or of `lo`–`hi`, optionally at an RPE / %1RM of `intensity`. */
export const working = (lo: number, hi?: number, intensity?: number): SetSpec => ({
  type: "working",
  amount: lo,
  ...(hi === undefined ? {} : { upTo: hi }),
  ...(intensity === undefined ? {} : { intensity }),
});

export const warmup = (reps: number): SetSpec => ({ type: "warmup", amount: reps });

/** The prescription most tests train on: three working sets of 8–12. */
export const threeSets = (): SetSpec[] => [working(8, 12), working(8, 12), working(8, 12)];

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
  const details = {
    id: uid("set"),
    value: reps,
    weight,
    trigger: "manual",
    planItemId: null,
    setType: "working",
  } as const;
  const set = loggedSet(ex, at, details);
  // A set moved to another day belongs to that day's session, unless told otherwise.
  return { ...set, session: overrides.date ?? set.session, ...overrides };
}

/** What one plan item did on earlier days: these `sets` of each kind, of exercise `exId`. */
export const carry = (exId: string, sets: Partial<SetCounts>): CarriedItem => ({
  exId,
  sets: { ...NO_SETS, ...sets },
});

/** An unfinished floating day that came back: its visit began on `startedOn`, with `items` behind it. */
export const visit = (startedOn: Date, items: CarriedItems): CarriedVisit => ({
  startedOn: dateKey(startedOn),
  items,
});

/** How a day went against its plan: `done` of `planned` sets. */
export const dayRecord = (date: Date, planned: number, done: number): DayRecord => ({
  date: dateKey(date),
  planned,
  done,
});
