// Pure builder: statistics, trends and coverage in, exactly what the Progress
// screen renders out, every word already written.

import type { CalendarCell, TrainingStats } from "@nabd/analytics";
import type { MuscleVolume, Recommendation } from "@nabd/coverage";
import { recommendation } from "@nabd/coverage";
import type { BarDatum } from "@nabd/design-system";
import type { Coverage, MuscleKey, ProgressTab, Trigger } from "@nabd/domain";
import { MUSCLES, formatAmount, formatGain, parseDateKey } from "@nabd/domain";
import type { ExerciseProgress } from "@nabd/progression";
import { NO_SETS, calendar, completion, kpis, timeOfDay, triggers, weekly } from "./stats-sections";

export interface KpiVM {
  label: string;
  value: string;
  unit: string;
}

export interface CalendarVM {
  /** "November 2026". */
  month: string;
  /** Column headings, Sunday first. */
  weekdays: readonly string[];
  /** Column of the 1st of the month, 0 = Sunday. */
  firstWeekday: number;
  cells: CalendarCell[];
}

export interface ConsistencyVM {
  /** Which of the two views is showing. */
  tab: ProgressTab;
  calendar: CalendarVM;
  weekly: BarDatum[];
}

/** A section with nothing to show yet says why instead. */
export interface EmptyVM {
  empty: string;
}

export function isEmpty<Section extends object>(section: Section | EmptyVM): section is EmptyVM {
  return "empty" in section;
}

export interface CompletionVM {
  /** "50%". */
  weekPct: string;
  days: BarDatum[];
}

export interface TimeOfDayVM {
  /** "Peak 9a". */
  peak: string;
  bars: BarDatum[];
}

export interface TriggerShareVM {
  trigger: Trigger;
  label: string;
  /** 0–100. */
  pct: number;
  /** "56%". */
  share: string;
}

export interface MuscleCoverageVM {
  muscle: MuscleKey;
  /** 0–100. */
  pct: number;
  recommendation: Recommendation;
}

export interface HeatmapVM {
  coverage: Coverage;
  /** The muscles trained in the window, most covered first. */
  muscles: MuscleCoverageVM[] | EmptyVM;
}

export interface ProgressionRowVM {
  exId: string;
  exercise: string;
  /** Best score of each session, oldest first. */
  series: readonly number[];
  /** "76 kg e1RM". */
  best: string;
  /** "+6.3 kg e1RM". */
  gain: string;
  /** False once the latest session is below the first. */
  up: boolean;
}

export interface ProgressVM {
  kpis: KpiVM[];
  consistency: ConsistencyVM;
  completion: CompletionVM | EmptyVM;
  timeOfDay: TimeOfDayVM | EmptyVM;
  triggers: TriggerShareVM[] | EmptyVM;
  heatmap: HeatmapVM;
  progression: ProgressionRowVM[] | EmptyVM;
}

export interface ProgressInput {
  stats: TrainingStats;
  progress: ExerciseProgress;
  /** What was trained in the last 7 days. */
  coverage: Coverage;
  /** What the program trains, to tell a lagging muscle from one never targeted. */
  planned: MuscleVolume;
  /** Today's date key. */
  today: string;
  tab: ProgressTab;
}

function heatmap(coverage: Coverage, planned: MuscleVolume): HeatmapVM {
  const trained = MUSCLES.filter((muscle) => coverage[muscle] > 0)
    .map((muscle) => ({
      muscle,
      pct: coverage[muscle],
      recommendation: recommendation(muscle, coverage, planned),
    }))
    .sort((a, b) => b.pct - a.pct);
  return {
    coverage,
    muscles: trained.length > 0 ? trained : { empty: "No sets in the last 7 days." },
  };
}

function progression(progress: ExerciseProgress): ProgressVM["progression"] {
  if (progress.trends.length === 0) {
    return {
      empty: `${NO_SETS} Each exercise gets a trend and a personal best after its first session.`,
    };
  }
  return progress.trends.map(
    (trend): ProgressionRowVM => ({
      exId: trend.exId,
      exercise: progress.nameOf(trend.exId),
      series: trend.series,
      best: formatAmount(trend.best, trend.unit),
      gain: formatGain(trend.gain, trend.unit),
      up: trend.gain >= 0,
    }),
  );
}

export function buildProgressVM(input: ProgressInput): ProgressVM {
  const { stats, progress, coverage, planned, today, tab } = input;
  return {
    kpis: kpis(stats),
    consistency: { tab, calendar: calendar(stats, parseDateKey(today)), weekly: weekly(stats) },
    completion: completion(stats),
    timeOfDay: timeOfDay(stats),
    triggers: triggers(stats),
    heatmap: heatmap(coverage, planned),
    progression: progression(progress),
  };
}
