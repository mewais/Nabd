import type { LoggedSet, TrackingType, WeightUnit } from "@nabd/domain";
import { displayWeight, isTimeBased } from "@nabd/domain";
import { ExerciseHistory, assistedScore, estimatedMax } from "./history";
import type { Performance } from "./history";

/**
 * What a trend is measured in: estimated one-rep max, load relative to
 * bodyweight (assisted exercises), or plain reps or seconds.
 */
export type TrendUnit = `${WeightUnit} e1RM` | `${WeightUnit} vs bodyweight` | "reps" | "s";

/** How one exercise has progressed, session by session. */
export interface ExerciseTrend {
  exId: string;
  /**
   * Best set of each session, oldest first, all in `unit`: estimated 1RM if the
   * exercise has ever been loaded, load relative to bodyweight if assisted,
   * else reps/seconds.
   */
  series: number[];
  unit: TrendUnit;
  best: number;
  current: number;
  /** Latest session minus the first. */
  gain: number;
  /** Date key of the first session. */
  since: string;
}

/** How one exercise's sets are scored for its trend, and what that score is measured in. */
interface Scale {
  unit: TrendUnit;
  score: (set: Performance) => number;
}

/**
 * One unit per exercise, never a mix. `loaded`: the exercise has been logged
 * with weight at least once, so its trend is an estimated 1RM throughout (an
 * unloaded set of it scores 0); an exercise never loaded is trended in reps or
 * seconds.
 */
function scaleFor(tracking: TrackingType | undefined, loaded: boolean, unit: WeightUnit): Scale {
  if (tracking === "assisted_bodyweight") {
    return {
      unit: `${unit} vs bodyweight`,
      score: (set) => displayWeight(assistedScore(set), unit),
    };
  }
  if (loaded)
    return { unit: `${unit} e1RM`, score: (set) => displayWeight(estimatedMax(set), unit) };
  const timed = tracking !== undefined && isTimeBased(tracking);
  return { unit: timed ? "s" : "reps", score: (set) => set.reps };
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
    const scale = scaleFor(trackingOf(exId), sets.hasLoad, unit);
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
