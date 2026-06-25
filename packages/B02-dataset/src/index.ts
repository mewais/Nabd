// @nabd/dataset — exercise library: offline re-tag pipeline + runtime accessors.
// SKELETON: signatures are frozen (tests target these). Bodies throw until the
// coding agent implements them. The coding agent also runs the pipeline to emit
// data/exercises.json and provides SEED (handoff seed re-tagged to the taxonomy).

import type { Exercise, Equipment, MuscleKey, MuscleGroup } from "@nabd/domain";

const NI = (): never => {
  throw new Error("not implemented");
};

/** Shape of one record in the free-exercise-db source snapshot. */
export interface RawExercise {
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
  id: string;
}

// ----- Pipeline (offline build + unit-tested) -----

/** Map a free-exercise-db equipment string to our key, or null if unsupported. */
export function normalizeEquipment(_src: string | null): Equipment | null {
  return NI();
}

/** Map a coarse source muscle name to zero or more of our 23 keys. */
export function normalizeMuscle(_src: string): MuscleKey[] {
  return NI();
}

/** Map a source muscle name to our planner group. */
export function normalizeGroup(_primarySource: string): MuscleGroup | null {
  return NI();
}

/** Infer a tracking type from name/force/mechanic/category/equipment. */
export function inferTracking(_rec: RawExercise): import("@nabd/domain").TrackingType {
  return NI();
}

/**
 * Refine shoulder/back coarse tags into specific heads using the exercise name
 * (e.g. "lateral raise" -> side_delts, "rear/reverse fly|face pull" -> rear_delts,
 * "front raise|overhead press" -> front_delts; "row|pulldown" adds rhomboids).
 */
export function refineMuscles(_name: string, _muscles: MuscleKey[]): MuscleKey[] {
  return NI();
}

/** Normalize one raw record into our Exercise, or null if it cannot be mapped. */
export function normalizeRecord(_rec: RawExercise): Exercise | null {
  return NI();
}

/** Merge re-tagged imports with the seed; seed wins on id/name collisions. */
export function mergeAndDedupe(_seed: Exercise[], _imported: Exercise[]): Exercise[] {
  return NI();
}

/** Full build: raw free-exercise-db + seed -> validated, deduped dataset. */
export function buildDataset(_rawFreeDb: unknown, _seed: Exercise[]): Exercise[] {
  return NI();
}

/** The handoff seed library, re-tagged into the 23-muscle taxonomy. */
export const SEED: Exercise[] = NI();

/** The bundled, built dataset (data/exercises.json). */
export const EXERCISES: Exercise[] = NI();

// ----- Runtime accessors -----

export interface Library {
  all(): Exercise[];
  byId(id: string): Exercise | undefined;
  search(q: string): Exercise[];
  byGroup(group: MuscleGroup): Exercise[];
  /** Exercises whose equipment is in the given profile equipment set. */
  filterByProfile(equipment: Equipment[]): Exercise[];
  /** Combined primary+secondary muscles of an exercise. */
  musclesOf(ex: Exercise): MuscleKey[];
  /** A new Library that also includes the given custom exercises. */
  withCustom(custom: Exercise[]): Library;
}

/** Build a Library over an explicit exercise array (used in tests + app). */
export function createLibrary(_exercises: Exercise[]): Library {
  return NI();
}

/** Default library over the bundled EXERCISES. */
export function defaultLibrary(): Library {
  return NI();
}
