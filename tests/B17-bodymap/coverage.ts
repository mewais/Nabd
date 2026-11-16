// Shared fixture for the body-map suites.

import { MUSCLES, type Coverage, type MuscleKey } from "@nabd/domain";

/** Coverage of 0 for every muscle except the ones given. */
export function coverageOf(trained: Partial<Record<MuscleKey, number>> = {}): Coverage {
  return { ...Object.fromEntries(MUSCLES.map((muscle) => [muscle, 0])), ...trained } as Coverage;
}
