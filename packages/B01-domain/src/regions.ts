import type { MuscleKey } from "./muscles";

/**
 * Maps each tracking muscle to one or more coarse body-map slugs from the
 * react-native-body-highlighter asset (assets/body). Multiple tracking muscles
 * can share the same slug (e.g. front/side/rear delts all → "deltoids"); the
 * renderer averages their coverages to compute per-slug opacity.
 * Slugs with no mapping here (head/hair/hands/feet/knees/ankles) render neutral.
 */
export const MUSCLE_REGION_MAP: Record<MuscleKey, string[]> = {
  front_delts: ["deltoids"],
  side_delts: ["deltoids"],
  rear_delts: ["deltoids"],
  neck: ["neck"],
  upper_traps: ["trapezius"],
  lower_traps: ["trapezius"],
  rhomboids: ["upper-back"],
  lats: ["upper-back"],
  lower_back: ["lower-back"],
  chest: ["chest"],
  abs: ["abs"],
  obliques: ["obliques"],
  quads: ["quadriceps"],
  hamstrings: ["hamstring"],
  glutes: ["gluteal"],
  abductors: ["gluteal"],
  adductors: ["adductors"],
  calves: ["calves"],
  tibialis: ["tibialis"],
  hip_flexors: ["quadriceps"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  forearms: ["forearm"],
};
