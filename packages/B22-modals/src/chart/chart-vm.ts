import { plural } from "@nabd/domain";
import type { ExerciseTrend } from "@nabd/progression";
import { formatAmount, formatGain } from "@nabd/progression";

export interface ChartStatVM {
  label: string;
  value: string;
  tone: "neutral" | "accent" | "success";
}

/** Everything the full-history chart shows. */
export interface ChartVM {
  exercise: string;
  /** "Since 2026-11-02 · 7 sessions". */
  subtitle: string;
  stats: ChartStatVM[];
  /** Best set of each session, oldest first. */
  series: number[];
  /** Names the chart for assistive tech. */
  chartLabel: string;
  /** Captions under the left and right ends of the chart. */
  startLabel: string;
  endLabel: string;
}

export function buildChartVM(exercise: string, trend: ExerciseTrend): ChartVM {
  const { series, unit } = trend;
  return {
    exercise,
    subtitle: `Since ${trend.since} · ${plural(series.length, "session")}`,
    stats: [
      { label: "Personal best", value: formatAmount(trend.best, unit), tone: "accent" },
      { label: "Current", value: formatAmount(trend.current, unit), tone: "neutral" },
      { label: "All-time gain", value: formatGain(trend.gain, unit), tone: "success" },
    ],
    series,
    chartLabel: `${exercise}, ${unit} per session`,
    startLabel: trend.since,
    endLabel: "Now",
  };
}
