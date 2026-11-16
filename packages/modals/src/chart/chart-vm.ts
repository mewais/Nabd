import type { StatFigure } from "@nabd/design-system";
import type { WeightUnit } from "@nabd/domain";
import { formatAmount, formatGain, plural } from "@nabd/domain";
import type { ExerciseTrend } from "@nabd/progression";
import { trendIn } from "@nabd/progression";

/** Everything the full-history chart shows. */
export interface ChartVM {
  exercise: string;
  /** "Since 2026-11-02 · 7 sessions". */
  subtitle: string;
  stats: StatFigure[];
  /** Best set of each session, oldest first. */
  series: number[];
  /** Names the chart for assistive tech. */
  chartLabel: string;
  /** Captions under the left and right ends of the chart. */
  startLabel: string;
  endLabel: string;
}

/** The chart of `trend`, an exercise called `exercise`, with loads shown in `unit`. */
export function buildChartVM(exercise: string, trend: ExerciseTrend, unit: WeightUnit): ChartVM {
  const shown = trendIn(trend, unit);
  return {
    exercise,
    subtitle: `Since ${trend.since} · ${plural(shown.series.length, "session")}`,
    stats: [
      { label: "Personal best", value: formatAmount(shown.best, shown.unit), tone: "accent" },
      { label: "Current", value: formatAmount(shown.current, shown.unit), tone: "neutral" },
      { label: "All-time gain", value: formatGain(shown.gain, shown.unit), tone: "success" },
    ],
    series: shown.series,
    chartLabel: `${exercise}, ${shown.unit} per session`,
    startLabel: trend.since,
    endLabel: "Now",
  };
}
