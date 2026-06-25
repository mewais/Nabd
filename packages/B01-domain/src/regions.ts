import type { MuscleKey } from "./muscles";

/**
 * Maps each tracking muscle to one or more body-muscles SVG region-id prefixes
 * (the id minus its `-left` / `-right` suffix). The body map tints every region
 * whose id starts with one of a muscle's prefixes by that muscle's coverage.
 * Several fine regions roll up into one tracking muscle (e.g. all three lat
 * bands → `lats`); regions with no muscle here render neutral grey.
 */
export const MUSCLE_REGION_MAP: Record<MuscleKey, string[]> = {
  front_delts: ["shoulder-front"],
  side_delts: ["shoulder-side"],
  rear_delts: ["deltoid-rear"],
  neck: ["neck", "nape"],
  upper_traps: ["traps-upper"],
  rhomboids: ["traps-mid"],
  lower_traps: ["traps-lower"],
  lats: ["lats-upper", "lats-mid", "lats-lower"],
  lower_back: ["lower-back-erectors", "lower-back-ql", "spine"],
  chest: ["chest-upper", "chest-lower"],
  abs: ["abs-upper", "abs-lower"],
  obliques: ["obliques", "serratus-anterior"],
  quads: ["quads"],
  hamstrings: ["hamstrings-medial", "hamstrings-lateral"],
  glutes: ["gluteus-maximus"],
  abductors: ["gluteus-medius"],
  adductors: ["adductors"],
  calves: ["calves-gastroc-medial", "calves-gastroc-lateral", "calves-soleus"],
  tibialis: ["tibialis-anterior"],
  hip_flexors: ["hip-flexor"],
  biceps: ["biceps"],
  triceps: ["triceps-long", "triceps-lateral"],
  forearms: ["forearm", "forearm-flexors", "forearm-extensors"],
};
