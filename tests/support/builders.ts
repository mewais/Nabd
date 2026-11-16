// Small builders for domain objects — the one fixture kit, shared by every
// unit suite, by the end-to-end specs (e2e/support re-uses it) and by nothing
// else: dates, exercises, prescribed sets, rows, slots, days and plans, logged
// sets, day records. A prescription starts from the planner's own default
// (`initialPrescription`) and says only what it changes.

import type {
  CarriedItem,
  CarriedItems,
  CarriedVisit,
  CycledSlot,
  Day,
  DayRecord,
  Exercise,
  ExerciseLookup,
  ExercisePrescription,
  LoggedSet,
  MuscleKey,
  Prescription,
  Program,
  SetCounts,
  SetSpec,
} from "@nabd/domain";
import { NO_SETS, dateKey, loggedSet, measureOfMode } from "@nabd/domain";
import { initialPrescription } from "@nabd/program-editor";

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

/** `count` working sets of 8–12 reps (or of `lo`–`hi`): what most tests train on. */
export const workingSets = (count: number, lo = 8, hi = 12): SetSpec[] =>
  Array.from({ length: count }, () => working(lo, hi));

/** The planner's default prescription in the measure of `overrides.repMode`, with these `sets`. */
export function prescription(sets: SetSpec[], overrides: Partial<Prescription> = {}): Prescription {
  const measure = measureOfMode(overrides.repMode ?? "range");
  return { ...initialPrescription(measure), sets, ...overrides };
}

/** A fixed day's row of exercise `exId`. */
export function row(
  exId: string,
  sets: SetSpec[],
  overrides: Partial<ExercisePrescription> = {},
): ExercisePrescription {
  return { id: uid("row"), exId, ...prescription(sets, overrides), ...overrides };
}

/** A cycled day's slot for `muscle`, rotating through `pool`. */
export function slot(
  muscle: MuscleKey,
  pool: string[],
  sets: SetSpec[],
  overrides: Partial<CycledSlot> = {},
): CycledSlot {
  return { id: uid("slot"), muscle, pool, ...prescription(sets, overrides), ...overrides };
}

/** A training day called `name`, on no weekday and empty unless `overrides` say otherwise. */
export function day(name: string, overrides: Partial<Day> = {}): Day {
  return { id: name.toLowerCase(), name, weekday: null, exercises: [], slots: [], ...overrides };
}

/** A fixed plan whose days come round in order, unless `overrides` say otherwise. */
export function plan(days: Day[], overrides: Partial<Program> = {}): Program {
  return { name: "Test plan", type: "fixed", schedule: "floating", days, ...overrides };
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
