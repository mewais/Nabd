// The data a spec starts from (handed to the app through the demo backend's
// snapshot seam), built with the unit suites' fixture kit (tests/support): the
// same exercises by the same names, the same prescriptions. What is the specs'
// own is that every row, slot and day goes by a readable id.

import type {
  CycledSlot,
  Day,
  ExercisePrescription,
  LoggedSet,
  MuscleKey,
  Program,
  SetSpec,
  Trigger,
} from "@nabd/domain";
import {
  day as kitDay,
  logged,
  plan as kitPlan,
  row,
  slot as kitSlot,
  workingSets,
} from "../../tests/support/builders";
import { CATALOG, catalogExercise } from "../../tests/support/exercises";
import { at } from "./time";

export { workingSets };

type Catalog = typeof CATALOG;

/** The catalog exercises the specs use — those of the kit's `CATALOG` — with the name the UI shows. */
export const EXERCISE = Object.fromEntries(
  Object.entries(CATALOG).map(([key, id]) => [key, { id, name: catalogExercise(id).name }]),
) as { [K in keyof Catalog]: { id: Catalog[K]; name: string } };

/** A row of a fixed day: two working sets of 8–12 unless `more` says otherwise; its id is the exercise's. */
export function planned(
  exId: string,
  more: Partial<ExercisePrescription> = {},
): ExercisePrescription {
  return row(exId, workingSets(2), { id: exId, ...more });
}

/** A slot of a cycled day, rotating through `pool`; its id is the muscle's. */
export function slot(muscle: MuscleKey, pool: string[]): CycledSlot {
  return kitSlot(muscle, pool, workingSets(2), { id: muscle });
}

/** A day of `exercises`; its id is its name in lower case. */
export function day(name: string, exercises: ExercisePrescription[], more: Partial<Day> = {}): Day {
  return kitDay(name, { exercises, ...more });
}

/** A fixed plan whose days come round in order, unless `more` says otherwise. */
export function plan(days: Day[], more: Partial<Program> = {}): Program {
  return kitPlan(days, { name: "Desk plan", ...more });
}

interface SetSeed {
  /** Date key of the day it was logged on. */
  day: string;
  /** Date key of the day its session began, when that was earlier (a floating day that came back). */
  session?: string;
  /** "HH:MM"; mid-morning unless it matters. */
  time?: string;
  reps: number;
  kg: number | null;
  trigger?: Trigger;
  /** A working set unless it says otherwise. */
  type?: SetSpec["type"];
}

/** A history row for a set of a catalog exercise, logged against its `planned` row. */
export function loggedSet(exId: string, seed: SetSeed): LoggedSet {
  return logged(catalogExercise(exId), at(seed.time ?? "10:00", seed.day), seed.reps, seed.kg, {
    trigger: seed.trigger ?? "manual",
    planItemId: exId,
    setType: seed.type ?? "working",
    date: seed.day,
    session: seed.session ?? seed.day,
  });
}
