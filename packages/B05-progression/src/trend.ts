import type { LoggedSet, TrackingType, WeightUnit } from "@nabd/domain";
import { displayWeight, isTimeBased } from "@nabd/domain";
import { ExerciseHistory, assistedScore, strengthScore } from "./history";
import type { Performance } from "./history";

/** How one exercise has progressed, session by session. */
export interface ExerciseTrend {
  exId: string;
  /**
   * Best set of each session, oldest first: estimated 1RM if loaded, load
   * relative to bodyweight if assisted, else reps/seconds.
   */
  series: number[];
  /** What the series is measured in: "kg e1RM", "kg vs bodyweight", "reps" or "s". */
  unit: string;
  best: number;
  current: number;
  /** Latest session minus the first. */
  gain: number;
  /** Date key of the first session. */
  since: string;
}

/** How one exercise's sets are scored for its trend, and what that score is measured in. */
interface Scale {
  unit: string;
  score: (set: Performance) => number;
}

/** `loaded`: the exercise has been logged with weight at least once. */
function scaleFor(tracking: TrackingType | undefined, loaded: boolean, unit: WeightUnit): Scale {
  if (tracking === "assisted_bodyweight") {
    return {
      unit: `${unit} vs bodyweight`,
      score: (set) => displayWeight(assistedScore(set), unit),
    };
  }
  if (loaded)
    return { unit: `${unit} e1RM`, score: (set) => displayWeight(strengthScore(set), unit) };
  const timed = tracking !== undefined && isTimeBased(tracking);
  return { unit: timed ? "s" : "reps", score: strengthScore };
}

/**
 * One trend per exercise with history, in order of first appearance.
 * `trackingOf` says how an exercise is tracked (undefined once it has been
 * deleted from the library, when its logged values are all there is to go on).
 */
export function exerciseTrends(
  history: readonly LoggedSet[],
  unit: WeightUnit,
  trackingOf: (exId: string) => TrackingType | undefined,
): ExerciseTrend[] {
  const exIds = [...new Set(history.map((s) => s.exId))];
  return exIds.flatMap((exId) => {
    const sets = new ExerciseHistory(history, exId);
    if (sets.isEmpty) return [];
    const loaded = history.some((s) => s.exId === exId && (s.weight ?? 0) > 0);
    const scale = scaleFor(trackingOf(exId), loaded, unit);
    const series = sets.bestPerSession(scale.score);
    return [
      {
        exId,
        series,
        unit: scale.unit,
        best: Math.max(...series),
        current: series.at(-1)!,
        gain: series.at(-1)! - series[0]!,
        since: sets.dates[0]!,
      },
    ];
  });
}

/** SVG polyline points for a series drawn inside a `w`×`h` box with `pad` padding. */
export function trendPoints(series: number[], w: number, h: number, pad: number): string {
  const min = Math.min(...series);
  const span = Math.max(...series) - min;
  const xStep = series.length > 1 ? (w - 2 * pad) / (series.length - 1) : 0;

  return series
    .map((value, i) => {
      const level = span === 0 ? 0.5 : (value - min) / span;
      const x = pad + i * xStep;
      const y = pad + (1 - level) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
