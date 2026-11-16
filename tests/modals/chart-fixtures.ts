// Scenarios for the full-history chart suites: real trends from logged sets.

import type { LoggedSet, WeightUnit } from "@nabd/domain";
import { ExerciseProgress } from "@nabd/progression";
import type { ExerciseTrend } from "@nabd/progression";
import { LIBRARY, did } from "../support/plan-fixtures";
import type { ExKey } from "../support/plan-fixtures";
import { nov } from "../support/domain-factories";

/** The trend of `ex` over `history`; throws if it has none. */
export function trendOf(history: LoggedSet[], ex: ExKey, unit: WeightUnit = "kg"): ExerciseTrend {
  const trend = new ExerciseProgress(history, LIBRARY.lookup, unit).trendOf(ex);
  if (!trend) throw new Error(`no trend for "${ex}"`);
  return trend;
}

/** Three bench sessions; each session's best set is an e1RM of 76 → 78 → 79.2 kg. */
export const benchHistory = (): LoggedSet[] => [
  did(null, "bench", 8, 60, { at: nov(2) }),
  did(null, "bench", 6, 60, { at: nov(2) }),
  did(null, "bench", 9, 60, { at: nov(9) }),
  did(null, "bench", 8, 62.5, { at: nov(16) }),
];
