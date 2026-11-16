// Pure builder: statistics, trends and coverage in, the Progress view model out.

import type { TrainingStats } from "@nabd/analytics";
import { recommendation } from "@nabd/coverage";
import type { Coverage } from "@nabd/domain";
import { MUSCLES, parseDateKey } from "@nabd/domain";
import { formatAmount, formatGain } from "@nabd/progression";
import type { ExerciseProgress } from "./exercise-progress";
import {
  NO_SETS,
  calendar,
  completion,
  kpis,
  timeOfDay,
  triggers,
  weekly,
} from "./stats-sections";
import type { HeatmapVM, ProgressVM, ProgressionRowVM } from "./view-model";

function heatmap(coverage: Coverage): HeatmapVM {
  const trained = MUSCLES.filter((muscle) => coverage[muscle] > 0)
    .map((muscle) => ({
      muscle,
      pct: coverage[muscle],
      recommendation: recommendation(coverage[muscle]),
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

export interface ProgressInput {
  stats: TrainingStats;
  progress: ExerciseProgress;
  /** What was trained in the last 7 days. */
  coverage: Coverage;
  /** Today's date key. */
  today: string;
}

export function buildProgressVM({ stats, progress, coverage, today }: ProgressInput): ProgressVM {
  return {
    kpis: kpis(stats),
    consistency: { calendar: calendar(stats, parseDateKey(today)), weekly: weekly(stats) },
    completion: completion(stats),
    timeOfDay: timeOfDay(stats),
    triggers: triggers(stats),
    heatmap: heatmap(coverage),
    progression: progression(progress),
  };
}
