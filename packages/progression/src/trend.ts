import type { LoggedSet, TrackingType, WeightUnit } from "@nabd/domain";
import { inUnit, isAssisted, isTimeBased, roundTo } from "@nabd/domain";
import { estimatedMax } from "./epley";
import { ExerciseHistory, assistedScore } from "./history";
import type { Performance } from "./history";

/**
 * What a trend measures: an estimated one-rep max, load relative to bodyweight
 * (assisted exercises) — both in kg — or plain reps or seconds.
 */
type TrendScale = "e1rm" | "bodyweight" | "reps" | "seconds";

/** A trend's figures: the best set of each session, and what stands out of them. */
interface TrendFigures {
  /** Best set of each session, oldest first. */
  series: number[];
  best: number;
  current: number;
  /** Latest session minus the first. */
  gain: number;
}

/**
 * How one exercise has progressed, session by session, on one scale: estimated
 * 1RM if the exercise has ever been loaded, load relative to bodyweight if
 * assisted, else reps or seconds. Loads are in kg ({@link trendIn} converts).
 */
export interface ExerciseTrend extends TrendFigures {
  exId: string;
  scale: TrendScale;
  /** Date key of the first session. */
  since: string;
}

const SCORES: Record<TrendScale, (set: Performance) => number> = {
  e1rm: estimatedMax,
  bodyweight: assistedScore,
  reps: (set) => set.reps,
  seconds: (set) => set.reps,
};

/**
 * One scale per exercise, never a mix. `loaded`: the exercise has been logged
 * with weight at least once, so its trend is an estimated 1RM throughout (an
 * unloaded set of it scores 0); an exercise never loaded is trended in reps or
 * seconds.
 */
function scaleFor(tracking: TrackingType | undefined, loaded: boolean): TrendScale {
  if (tracking !== undefined && isAssisted(tracking)) return "bodyweight";
  if (loaded) return "e1rm";
  return tracking !== undefined && isTimeBased(tracking) ? "seconds" : "reps";
}

/**
 * One trend per exercise with history, in order of first appearance.
 * `trackingOf` says how an exercise is tracked (undefined once it has been
 * deleted from the library, when its logged values are all there is to go on).
 */
export function exerciseTrends(
  history: readonly LoggedSet[],
  trackingOf: (exId: string) => TrackingType | undefined,
): ExerciseTrend[] {
  const exIds = [...new Set(history.map((s) => s.exId))];
  return exIds.flatMap((exId) => {
    const sets = new ExerciseHistory(history, exId);
    const since = sets.dates[0];
    if (since === undefined) return [];
    const scale = scaleFor(trackingOf(exId), sets.hasLoad);
    const series = sets.bestPerSession(SCORES[scale]);
    const first = series[0] ?? 0;
    const current = series.at(-1) ?? first;
    return [
      { exId, scale, series, best: Math.max(...series), current, gain: current - first, since },
    ];
  });
}

/** A derived load (an estimated 1RM) is not something to read to the gram. */
const FIGURE_DECIMALS = 2;

const SCALE_UNITS: Record<TrendScale, (unit: WeightUnit) => string> = {
  e1rm: (unit) => `${unit} e1RM`,
  bodyweight: (unit) => `${unit} vs bodyweight`,
  reps: () => "reps",
  seconds: () => "s",
};

/** A trend's figures as the user reads them: loads in `unit`, and what they are measured in. */
export function trendIn(trend: ExerciseTrend, unit: WeightUnit): TrendFigures & { unit: string } {
  const isLoad = trend.scale === "e1rm" || trend.scale === "bodyweight";
  const shown = (value: number): number =>
    isLoad ? roundTo(inUnit(value, unit), FIGURE_DECIMALS) : value;
  return {
    series: trend.series.map(shown),
    best: shown(trend.best),
    current: shown(trend.current),
    gain: shown(trend.gain),
    unit: SCALE_UNITS[trend.scale](unit),
  };
}
