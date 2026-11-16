// Pure builders: statistics in, exactly what the Progress screen renders out.

import type { TrainingStats } from "@nabd/analytics";
import type { ExerciseTrend } from "@nabd/progression";
import { formatAmount, formatGain, trendPoints } from "@nabd/progression";

export interface Kpi {
  label: string;
  value: string;
  unit: string;
}

export interface CalendarCellVM {
  day: number;
  /** -1 future, 0 none, 1..3 intensity. */
  level: number;
}

export interface BarVM {
  label: string;
  value: number;
  /** 0–100, relative to the tallest bar. */
  heightPct: number;
  current?: boolean;
}

export interface TriggerSeg {
  label: string;
  pct: number;
  /** CSS colour. */
  color: string;
}

export interface ProgressionRowVM {
  exId: string;
  exercise: string;
  /** Sparkline polyline points. */
  points: string;
  pr: string;
  gainStr: string;
  up: boolean;
}

export interface ProgressVM {
  kpis: Kpi[];
  calendar: { month: string; cells: CalendarCellVM[] };
  weekly: BarVM[];
  completion: { weekPct: string; days: BarVM[] };
  timeOfDay: { bars: BarVM[]; peakLabel: string };
  triggers: TriggerSeg[];
  progression: ProgressionRowVM[];
}

const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];
const SPARKLINE = { width: 120, height: 34, pad: 5 };

/** Bars scaled against the tallest one. */
function bars(entries: { label: string; value: number }[]): BarVM[] {
  const max = Math.max(...entries.map((e) => e.value));
  return entries.map((entry, i) => ({
    ...entry,
    heightPct: max === 0 ? 0 : Math.round((entry.value / max) * 100),
    current: i === entries.length - 1 ? true : undefined,
  }));
}

/** "9a", "12p", "6p". */
function hourLabel(hour: number): string {
  return `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? "a" : "p"}`;
}

export function buildProgressVM(input: {
  stats: TrainingStats;
  trends: ExerciseTrend[];
  exerciseName: (exId: string) => string;
  now: Date;
}): ProgressVM {
  const { stats, trends, exerciseName, now } = input;
  const weekPct = stats.completionThisWeek();
  const { buckets, peak } = stats.timeOfDay();
  const mix = stats.triggerMix();
  const weeks = stats.weeklySets();

  return {
    kpis: [
      { label: "Current streak", value: String(stats.streak()), unit: "days" },
      { label: "Completion this wk", value: String(weekPct), unit: "%" },
      { label: "Sets this week", value: String(stats.setsThisWeek()), unit: "sets" },
      { label: "Active days 30d", value: String(stats.activeDays()), unit: "days" },
    ],
    calendar: {
      month: now.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      cells: stats.calendar(),
    },
    weekly: bars(
      weeks.map((week, i) => ({
        label:
          i === weeks.length - 1
            ? "This wk"
            : week.weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: week.sets,
      })),
    ),
    completion: {
      weekPct: `${weekPct}%`,
      days: stats.completionByDay().map(({ date, pct }, i, days) => ({
        label: DAY_INITIALS[date.getDay()]!,
        value: pct ?? 0,
        heightPct: pct ?? 0,
        current: i === days.length - 1 ? true : undefined,
      })),
    },
    timeOfDay: {
      bars: bars(buckets.map((b) => ({ label: hourLabel(b.hour), value: b.count }))).map(
        ({ current: _current, ...bar }) => bar,
      ),
      peakLabel: peak === null ? "—" : hourLabel(peak),
    },
    triggers: [
      { label: "Idle detected", pct: mix.idle, color: "var(--accent)" },
      { label: "Timer", pct: mix.timer, color: "var(--accent2)" },
      { label: "Manual", pct: mix.manual, color: "var(--accent3)" },
    ],
    progression: trends.map((trend) => ({
      exId: trend.exId,
      exercise: exerciseName(trend.exId),
      points: trendPoints(trend.series, SPARKLINE.width, SPARKLINE.height, SPARKLINE.pad),
      pr: formatAmount(trend.best, trend.unit),
      gainStr: formatGain(trend.gain, trend.unit),
      up: trend.gain >= 0,
    })),
  };
}
