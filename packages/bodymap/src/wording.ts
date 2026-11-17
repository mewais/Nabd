// How the body map and its meters word coverage.

import type { Recommendation } from "@nabd/coverage";
import type { MuscleKey } from "@nabd/domain";
import { formatMuscles } from "@nabd/domain";
import type { BodySide } from "./body-map";

/** What a recommendation is called, where it is worth saying. */
export const RECOMMENDATION_NAMES: Record<Recommendation, string> = {
  rest: "Rest",
  push: "Push",
  none: "",
};

/** "47%" for a coverage of 46.8. */
export const coverageLabel = (pct: number): string => `${Math.round(pct)}%`;

/** "Body, front": names one drawing. */
export const bodyLabel = (side: BodySide): string => `Body, ${side}`;

/** "Front Delts, Side Delts · 47%": what a region shows, as its tooltip. */
export const regionLabel = (muscles: readonly MuscleKey[], pct: number): string =>
  `${formatMuscles(muscles)} · ${coverageLabel(pct)}`;
