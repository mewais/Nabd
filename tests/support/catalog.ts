// The built-in exercises the suites train on, by catalog id. `catalogExercise`
// fails loudly if the catalog ever stops having one of them.

import type { Exercise } from "@nabd/domain";
import { ExerciseLibrary } from "@nabd/dataset";

export const CATALOG = {
  bench: "bench_press__barbell",
  dumbbellBench: "bench_press__dumbbell",
  pushUp: "push_up__bodyweight",
  overheadPress: "overhead_press__barbell",
  fly: "fly__dumbbell",
  row: "row__barbell",
  plank: "plank__bodyweight",
  pullUp: "pull_up__pullupbar",
  pulldown: "lat_pulldown__cable",
  deadlift: "deadlift__barbell",
} as const;

/** Looks exercises up in the built-in catalog. */
export const catalogLookup = ExerciseLibrary.catalog.lookup;

export function catalogExercise(exId: string): Exercise {
  const exercise = catalogLookup(exId);
  if (!exercise) throw new Error(`${exId} is not in the catalog`);
  return exercise;
}
