// The exercises the suites train on — the one vocabulary, in two parts:
//  - `EX`: a handful of made-up exercises with fixed ids and properties, for
//    the suites that hand their own library (or lookup) to what they test;
//  - `CATALOG`: built-in exercises by catalog id, for the suites that run on
//    the app's own library (the store, the planner, the dataset itself).

import type { Exercise } from "@nabd/domain";
import { ExerciseLibrary } from "@nabd/dataset";
import { exercise } from "./builders";

export const EX = {
  bench: exercise({
    id: "bench",
    name: "Bench Press",
    group: "Chest",
    primary: ["chest"],
    secondary: ["triceps", "front_delts"],
    equipment: "barbell",
    tracking: "weight_reps",
  }),
  row: exercise({
    id: "row",
    name: "Barbell Row",
    group: "Back",
    primary: ["lats", "rhomboids"],
    secondary: ["biceps"],
    equipment: "barbell",
    tracking: "weight_reps",
  }),
  pushup: exercise({
    id: "pushup",
    name: "Push-Up",
    group: "Chest",
    primary: ["chest"],
    secondary: ["triceps"],
    equipment: "bodyweight",
    tracking: "bodyweight_reps",
  }),
  plank: exercise({
    id: "plank",
    name: "Plank",
    group: "Abs",
    primary: ["abs"],
    secondary: ["obliques"],
    equipment: "bodyweight",
    tracking: "duration",
  }),
  pullup: exercise({
    id: "pullup",
    name: "Assisted Pull-Up",
    group: "Back",
    primary: ["lats"],
    secondary: ["biceps"],
    equipment: "machine",
    tracking: "assisted_bodyweight",
  }),
  dip: exercise({
    id: "dip",
    name: "Weighted Dip",
    group: "Triceps",
    primary: ["triceps"],
    secondary: ["chest"],
    equipment: "bodyweight",
    tracking: "weighted_bodyweight",
  }),
  fly: exercise({
    id: "fly",
    name: "Dumbbell Fly",
    group: "Chest",
    primary: ["chest"],
    secondary: [],
    equipment: "dumbbell",
    tracking: "weight_reps",
  }),
  raise: exercise({
    id: "raise",
    name: "Lateral Raise",
    group: "Shoulders",
    primary: ["side_delts"],
    secondary: [],
    equipment: "dumbbell",
    tracking: "weight_reps",
  }),
  curl: exercise({
    id: "curl",
    name: "Dumbbell Curl",
    group: "Biceps",
    primary: ["biceps"],
    secondary: ["forearms"],
    equipment: "dumbbell",
    tracking: "weight_reps",
  }),
};
export type ExKey = keyof typeof EX;

/** A library of exactly the made-up exercises. */
export const LIBRARY = new ExerciseLibrary(Object.values(EX));

/** The built-in exercises the suites and the end-to-end specs train on, by catalog id. */
export const CATALOG = {
  bench: "bench_press__barbell",
  dumbbellBench: "bench_press__dumbbell",
  pushUp: "push_up__bodyweight",
  overheadPress: "overhead_press__barbell",
  fly: "fly__dumbbell",
  raise: "lateral_raise__dumbbell",
  curl: "curl__dumbbell",
  hammerCurl: "hammer_curl__dumbbell",
  gobletSquat: "goblet_squat__dumbbell",
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
