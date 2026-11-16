import type { Coverage, MuscleKey } from "@nabd/domain";
import { MUSCLES, MUSCLE_REGION_MAP } from "@nabd/domain";

/** The muscles drawn in each region of the map; several can share one (the three delts). */
const MUSCLES_BY_REGION = new Map<string, MuscleKey[]>();
for (const muscle of MUSCLES) {
  for (const slug of MUSCLE_REGION_MAP[muscle]) {
    MUSCLES_BY_REGION.set(slug, [...(MUSCLES_BY_REGION.get(slug) ?? []), muscle]);
  }
}

export interface RegionCoverage {
  muscles: readonly MuscleKey[];
  /** Mean coverage of those muscles, 0–100. */
  pct: number;
}

/**
 * How covered a region of the map is. Null for regions that track no muscle
 * (head, hands, feet…), which are always drawn neutral.
 */
export function regionCoverage(slug: string, coverage: Coverage): RegionCoverage | null {
  const muscles = MUSCLES_BY_REGION.get(slug);
  if (muscles === undefined) return null;
  const total = muscles.reduce((sum, m) => sum + Math.min(100, Math.max(0, coverage[m])), 0);
  return { muscles, pct: total / muscles.length };
}
