// Builders for the data a spec starts from (handed to the app through the demo
// backend's snapshot seam): small plans and hand-written history.

import { ExerciseLibrary } from "@nabd/dataset";
import type {
  CycledSlot,
  Day,
  ExercisePrescription,
  LoggedSet,
  MuscleKey,
  Prescription,
  Program,
  SetSpec,
  Trigger,
} from "@nabd/domain";
import { at } from "./time";

/** The catalog exercises the specs use, by the name the UI shows. */
export const EXERCISE = {
  bench: { id: "bench_press__dumbbell", name: "Dumbbell Bench Press" },
  barbellBench: { id: "bench_press__barbell", name: "Barbell Bench Press" },
  raise: { id: "lateral_raise__dumbbell", name: "Dumbbell Lateral Raise" },
  curl: { id: "curl__dumbbell", name: "Dumbbell Curl" },
  hammerCurl: { id: "hammer_curl__dumbbell", name: "Dumbbell Hammer Curl" },
  squat: { id: "goblet_squat__dumbbell", name: "Dumbbell Goblet Squat" },
  pullUp: { id: "pull_up__pullupbar", name: "Pull-Up" },
  pushUp: { id: "push_up__bodyweight", name: "Push-Up" },
} as const;

/** `count` working sets of 8–12 reps. */
export function workingSets(count: number): SetSpec[] {
  return Array.from({ length: count }, (): SetSpec => ({ type: "working", a: 8, b: 12 }));
}

/** What every row of a spec's plan asks for unless it says otherwise: two sets of 8–12, 90 s rest. */
const PRESCRIPTION: Prescription = {
  repMode: "range",
  intensity: "none",
  rest: 90,
  sets: workingSets(2),
};

/** A row of a fixed day; its id is the exercise's. */
export function planned(
  exId: string,
  more: Partial<ExercisePrescription> = {},
): ExercisePrescription {
  return { id: exId, exId, ...PRESCRIPTION, ...more };
}

/** A slot of a cycled day, rotating through `pool`; its id is the muscle's. */
export function slot(muscle: MuscleKey, pool: string[]): CycledSlot {
  return { id: muscle, muscle, pool, ...PRESCRIPTION };
}

export function day(name: string, exercises: ExercisePrescription[], more: Partial<Day> = {}): Day {
  return { id: name.toLowerCase(), name, weekday: null, exercises, slots: [], ...more };
}

/** A plan whose days come round in order; fixed unless `more` says otherwise. */
export function floatingProgram(days: Day[], more: Partial<Program> = {}): Program {
  return { name: "Desk plan", type: "fixed", schedule: "floating", days, ...more };
}

interface SetSeed {
  /** Date key of the day it was logged on. */
  day: string;
  /** "HH:MM"; mid-morning unless it matters. */
  time?: string;
  reps: number;
  kg: number | null;
  trigger?: Trigger;
}

let seededSets = 0;

/** A history row for a working set of a catalog exercise, logged against its `planned` row. */
export function loggedSet(exId: string, seed: SetSeed): LoggedSet {
  const exercise = ExerciseLibrary.catalog.byId(exId);
  if (!exercise) throw new Error(`the catalog has no exercise ${exId}`);
  return {
    id: `seeded-${++seededSets}`,
    exId,
    exercise: exercise.name,
    group: exercise.group,
    muscles: [...exercise.primary, ...exercise.secondary],
    value: seed.reps,
    weight: seed.kg,
    ts: at(seed.time ?? "10:00", seed.day).toISOString(),
    date: seed.day,
    trigger: seed.trigger ?? "manual",
    planItemId: exId,
    setType: "working",
  };
}
