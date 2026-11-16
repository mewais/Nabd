import type { Coverage, MuscleKey } from "@nabd/domain";
import { MUSCLES_ANATOMICAL, MUSCLE_NAMES } from "@nabd/domain";
import type { MuscleVolume, Recommendation } from "@nabd/coverage";
import { insight, recommendation } from "@nabd/coverage";
import type { MapStyle, MapView } from "@nabd/domain";

export interface LegendRowVM {
  muscle: MuscleKey;
  /** Coverage, 0–100. */
  pct: number;
  recommendation: Recommendation;
}

export interface CoverageVM {
  coverage: Coverage;
  view: MapView;
  mapStyle: MapStyle;
  legend: LegendRowVM[];
}

export interface InsightRowVM {
  kind: "rest" | "push";
  /** The bold opening, "Rest these". */
  lead: string;
  /** The rest of the sentence. */
  text: string;
}

export function buildCoverage(coverage: Coverage, view: MapView, mapStyle: MapStyle): CoverageVM {
  return {
    coverage,
    view,
    mapStyle,
    legend: MUSCLES_ANATOMICAL.map((muscle) => ({
      muscle,
      pct: coverage[muscle],
      recommendation: recommendation(coverage[muscle]),
    })),
  };
}

const names = (muscles: MuscleKey[]): string => muscles.map((m) => MUSCLE_NAMES[m]).join(", ");

/** What stands out in the week's coverage; empty when nothing does. */
export function buildInsight(coverage: Coverage, planned: MuscleVolume): InsightRowVM[] {
  const { rest, push } = insight(coverage, planned);
  const rows: InsightRowVM[] = [];
  if (rest.length > 0) {
    rows.push({
      kind: "rest",
      lead: "Rest these",
      text: ` — ${names(rest)} are well-trained this week.`,
    });
  }
  if (push.length > 0) {
    rows.push({
      kind: "push",
      lead: "Push these",
      text: ` — ${names(push)} are lagging. Good to prioritize.`,
    });
  }
  return rows;
}
