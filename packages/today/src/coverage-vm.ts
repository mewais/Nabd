import type { MuscleStanding, MuscleVolume, Recommendation } from "@nabd/coverage";
import { insight, standings } from "@nabd/coverage";
import type { Coverage } from "@nabd/domain";
import { MUSCLES_ANATOMICAL, formatMuscles } from "@nabd/domain";
import type { MapStyle, MapView } from "@nabd/view";

export interface CoverageVM {
  coverage: Coverage;
  view: MapView;
  mapStyle: MapStyle;
  /** Every muscle, in the order they are read down the body. */
  legend: MuscleStanding[];
}

/** One finding about the week's coverage. */
export interface InsightRowVM {
  kind: Exclude<Recommendation, "none">;
  /** The bold opening, "Rest these". */
  lead: string;
  /** The rest of the sentence. */
  text: string;
}

export function buildCoverageVM(
  coverage: Coverage,
  planned: MuscleVolume,
  view: MapView,
  mapStyle: MapStyle,
): CoverageVM {
  return { coverage, view, mapStyle, legend: standings(MUSCLES_ANATOMICAL, coverage, planned) };
}

/** What stands out in the week's coverage; empty when nothing does. */
export function buildInsightVM(coverage: Coverage, planned: MuscleVolume): InsightRowVM[] {
  const { rest, push } = insight(coverage, planned);
  const rows: InsightRowVM[] = [];
  if (rest.length > 0) {
    rows.push({
      kind: "rest",
      lead: "Rest these",
      text: ` — ${formatMuscles(rest)} are well-trained this week.`,
    });
  }
  if (push.length > 0) {
    rows.push({
      kind: "push",
      lead: "Push these",
      text: ` — ${formatMuscles(push)} are lagging. Good to prioritize.`,
    });
  }
  return rows;
}
