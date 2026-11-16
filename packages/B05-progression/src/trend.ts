import type { LoggedSet, WeightUnit } from "@nabd/domain";
import { displayWeight } from "@nabd/domain";
import { ExerciseHistory } from "./history";

/** How one exercise has progressed, session by session. */
export interface ExerciseTrend {
  exId: string;
  /** Best set of each session, oldest first: estimated 1RM if loaded, else reps/seconds. */
  series: number[];
  /** What the series is measured in: "kg e1RM", "reps" or "s". */
  unit: string;
  best: number;
  current: number;
  /** Latest session minus the first. */
  gain: number;
  /** Date key of the first session. */
  since: string;
}

/**
 * One trend per exercise with history, in order of first appearance.
 * `isTimed` says whether an exercise is measured in seconds rather than reps.
 */
export function exerciseTrends(
  history: readonly LoggedSet[],
  unit: WeightUnit,
  isTimed: (exId: string) => boolean,
): ExerciseTrend[] {
  const exIds = [...new Set(history.map((s) => s.exId))];
  return exIds.flatMap((exId) => {
    const sets = new ExerciseHistory(history, exId);
    if (sets.isEmpty) return [];
    const loaded = history.some((s) => s.exId === exId && (s.weight ?? 0) > 0);
    const series = sets.bestPerSession().map((v) => (loaded ? displayWeight(v, unit) : v));
    return [
      {
        exId,
        series,
        unit: loaded ? `${unit} e1RM` : isTimed(exId) ? "s" : "reps",
        best: Math.max(...series),
        current: series.at(-1)!,
        gain: series.at(-1)! - series[0]!,
        since: sets.dates[0]!,
      },
    ];
  });
}

/** A value with at most one decimal and its unit: "71.1 kg e1RM", "12 reps". */
export function formatAmount(value: number, unit: string): string {
  return `${Math.round(value * 10) / 10} ${unit}`;
}

/** A signed change: "+2.5 kg e1RM", "-1 reps", "0 reps". */
export function formatGain(value: number, unit: string): string {
  return `${value > 0 ? "+" : ""}${formatAmount(value, unit)}`;
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
