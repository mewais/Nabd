import { z } from "zod";

/**
 * The 23 tracking muscles. Analytics and coverage operate at this granularity;
 * the body map rolls these up onto SVG regions via MUSCLE_REGION_MAP.
 */
export const MUSCLES = [
  "front_delts",
  "side_delts",
  "rear_delts",
  "neck",
  "upper_traps",
  "rhomboids",
  "lower_traps",
  "lats",
  "lower_back",
  "chest",
  "abs",
  "obliques",
  "quads",
  "hamstrings",
  "glutes",
  "abductors",
  "adductors",
  "calves",
  "tibialis",
  "hip_flexors",
  "biceps",
  "triceps",
  "forearms",
] as const;

export type MuscleKey = (typeof MUSCLES)[number];

export const MuscleKeySchema = z.enum(MUSCLES);

/** Display names for each tracking muscle. */
export const MUSCLE_NAMES: Record<MuscleKey, string> = {
  front_delts: "Front Delts",
  side_delts: "Side Delts",
  rear_delts: "Rear Delts",
  neck: "Neck",
  upper_traps: "Upper Traps",
  rhomboids: "Rhomboids",
  lower_traps: "Lower Traps",
  lats: "Lats",
  lower_back: "Lower Back",
  chest: "Chest",
  abs: "Abs",
  obliques: "Obliques",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  abductors: "Abductors",
  adductors: "Adductors",
  calves: "Calves",
  tibialis: "Tibialis",
  hip_flexors: "Hip Flexors",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
};

/**
 * The 12 planner muscle groups. Every exercise belongs to exactly one group;
 * the planner's cycled mode organizes slots by group, and the library filters
 * by group.
 */
export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Traps",
  "Shoulders",
  "Triceps",
  "Biceps",
  "Forearms",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Abs",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MuscleGroupSchema = z.enum(MUSCLE_GROUPS);

/** The representative muscle used for cycled-slot volume attribution. */
export const GROUP_PRIMARY_MUSCLE: Record<MuscleGroup, MuscleKey> = {
  Chest: "chest",
  Back: "lats",
  Traps: "upper_traps",
  Shoulders: "side_delts",
  Triceps: "triceps",
  Biceps: "biceps",
  Forearms: "forearms",
  Quads: "quads",
  Hamstrings: "hamstrings",
  Glutes: "glutes",
  Calves: "calves",
  Abs: "abs",
};

/** All fine muscles a group encompasses (informational; primary listed first). */
export const GROUP_MUSCLES: Record<MuscleGroup, MuscleKey[]> = {
  Chest: ["chest"],
  Back: ["lats", "rhomboids", "lower_traps", "lower_back"],
  Traps: ["upper_traps", "lower_traps", "rhomboids"],
  Shoulders: ["side_delts", "front_delts", "rear_delts"],
  Triceps: ["triceps"],
  Biceps: ["biceps"],
  Forearms: ["forearms"],
  Quads: ["quads", "hip_flexors"],
  Hamstrings: ["hamstrings"],
  Glutes: ["glutes", "abductors", "adductors"],
  Calves: ["calves", "tibialis"],
  Abs: ["abs", "obliques"],
};

/**
 * Canonical browse-category group for each fine muscle. Used to derive an
 * exercise's `group` (library category) from its primary muscle, so the create
 * form selects specific muscles rather than broad groups. Ambiguous muscles
 * (rhomboids, lower_traps — listed under both Back and Traps) resolve to Back;
 * neck (in no group) maps to Traps.
 */
export const MUSCLE_PRIMARY_GROUP: Record<MuscleKey, MuscleGroup> = {
  front_delts: "Shoulders",
  side_delts: "Shoulders",
  rear_delts: "Shoulders",
  neck: "Traps",
  upper_traps: "Traps",
  rhomboids: "Back",
  lower_traps: "Back",
  lats: "Back",
  lower_back: "Back",
  chest: "Chest",
  abs: "Abs",
  obliques: "Abs",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  abductors: "Glutes",
  adductors: "Glutes",
  calves: "Calves",
  tibialis: "Calves",
  hip_flexors: "Quads",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
};
