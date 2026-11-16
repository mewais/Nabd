import type { Coverage, MuscleKey } from "@nabd/domain";
import { MUSCLES, clamp } from "@nabd/domain";

/** The regions of the body-map drawing (assets/body) that show a tracked muscle. */
type MuscleRegion =
  | "abs"
  | "adductors"
  | "biceps"
  | "calves"
  | "chest"
  | "deltoids"
  | "forearm"
  | "gluteal"
  | "hamstring"
  | "lower-back"
  | "neck"
  | "obliques"
  | "quadriceps"
  | "tibialis"
  | "trapezius"
  | "triceps"
  | "upper-back";

/**
 * Where each tracked muscle is drawn. The drawing is coarser than the muscle
 * list, so several muscles can share a region (the three delts); the region
 * then shows their mean coverage.
 */
const REGION_OF: Record<MuscleKey, MuscleRegion> = {
  front_delts: "deltoids",
  side_delts: "deltoids",
  rear_delts: "deltoids",
  neck: "neck",
  upper_traps: "trapezius",
  lower_traps: "trapezius",
  rhomboids: "upper-back",
  lats: "upper-back",
  lower_back: "lower-back",
  chest: "chest",
  abs: "abs",
  obliques: "obliques",
  quads: "quadriceps",
  hamstrings: "hamstring",
  glutes: "gluteal",
  abductors: "gluteal",
  adductors: "adductors",
  calves: "calves",
  tibialis: "tibialis",
  hip_flexors: "quadriceps",
  biceps: "biceps",
  triceps: "triceps",
  forearms: "forearm",
};

const MUSCLES_BY_REGION = new Map<string, MuscleKey[]>();
for (const muscle of MUSCLES) {
  const region = REGION_OF[muscle];
  MUSCLES_BY_REGION.set(region, [...(MUSCLES_BY_REGION.get(region) ?? []), muscle]);
}

export interface RegionCoverage {
  muscles: readonly MuscleKey[];
  /** Mean coverage of those muscles, 0–100. */
  pct: number;
}

/**
 * How covered a region of the drawing is. Null for regions that show no tracked
 * muscle (head, hands, feet…), which are always drawn neutral.
 */
export function regionCoverage(slug: string, coverage: Coverage): RegionCoverage | null {
  const muscles = MUSCLES_BY_REGION.get(slug);
  if (muscles === undefined) return null;
  const total = muscles.reduce((sum, muscle) => sum + clamp(coverage[muscle], 0, 100), 0);
  return { muscles, pct: total / muscles.length };
}
