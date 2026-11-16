import type { Coverage, MuscleKey } from "@nabd/domain";
import { clamp } from "@nabd/domain";

/**
 * The tracked muscles each region of the drawing (./drawing) shows. The
 * drawing is coarser than the muscle list, so several muscles can share a
 * region (the three delts); the region then shows their mean coverage.
 */
const REGION_MUSCLES = {
  deltoids: ["front_delts", "side_delts", "rear_delts"],
  neck: ["neck"],
  trapezius: ["upper_traps", "lower_traps"],
  "upper-back": ["rhomboids", "lats"],
  "lower-back": ["lower_back"],
  chest: ["chest"],
  abs: ["abs"],
  obliques: ["obliques"],
  quadriceps: ["quads", "hip_flexors"],
  hamstring: ["hamstrings"],
  gluteal: ["glutes", "abductors"],
  adductors: ["adductors"],
  calves: ["calves"],
  tibialis: ["tibialis"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  forearm: ["forearms"],
} as const satisfies Record<string, readonly MuscleKey[]>;

/** A region of the drawing that shows a tracked muscle. */
type MuscleRegion = keyof typeof REGION_MUSCLES;

/** The drawing also has regions that show no tracked muscle: head, hands, feet… */
const isMuscleRegion = (slug: string): slug is MuscleRegion => Object.hasOwn(REGION_MUSCLES, slug);

interface RegionCoverage {
  muscles: readonly MuscleKey[];
  /** Mean coverage of those muscles, 0–100. */
  pct: number;
}

/**
 * How covered a region of the drawing is. Null for regions that show no
 * tracked muscle, which are always drawn neutral.
 */
export function regionCoverage(slug: string, coverage: Coverage): RegionCoverage | null {
  if (!isMuscleRegion(slug)) return null;
  const muscles: readonly MuscleKey[] = REGION_MUSCLES[slug];
  const total = muscles.reduce((sum, muscle) => sum + clamp(coverage[muscle], 0, 100), 0);
  return { muscles, pct: total / muscles.length };
}
