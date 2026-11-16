// Pure builder: statistics, trends and coverage in, exactly what the Progress
// screen renders out, every word already written.

import type { TrainingStats } from "@nabd/analytics";
import type { MuscleStanding, MuscleVolume } from "@nabd/coverage";
import { CoverageReport } from "@nabd/coverage";
import type { StatFigure } from "@nabd/design-system";
import type { Coverage, WeightUnit } from "@nabd/domain";
import { MUSCLES, formatAmount, formatGain } from "@nabd/domain";
import type { ExerciseProgress } from "@nabd/progression";
import { trendIn } from "@nabd/progression";
import type { ProgressTab } from "@nabd/view";
import { buildCompletionVM } from "./completion-vm";
import type { CompletionVM } from "./completion-vm";
import { buildConsistencyVM } from "./consistency-vm";
import type { ConsistencyVM } from "./consistency-vm";
import { buildEmptyVM } from "./empty-vm";
import type { EmptyVM } from "./empty-vm";
import { buildKpisVM } from "./kpis-vm";
import { buildTimeOfDayVM } from "./time-of-day-vm";
import type { TimeOfDayVM } from "./time-of-day-vm";
import { buildTriggersVM } from "./triggers-vm";
import type { TriggerShareVM } from "./triggers-vm";
import { NOTHING_LOGGED } from "./wording";

export interface HeatmapVM {
  coverage: Coverage;
  /** The muscles trained in the window, most covered first. */
  muscles: MuscleStanding[] | EmptyVM;
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

/** Every exercise with history, or why there is none yet. */
export interface ProgressionVM {
  /** "Trend & personal best · click a row for full history". */
  subtitle: string;
  rows: ProgressionRowVM[] | EmptyVM;
}

export interface ProgressVM {
  kpis: StatFigure[];
  consistency: ConsistencyVM;
  completion: CompletionVM | EmptyVM;
  timeOfDay: TimeOfDayVM | EmptyVM;
  triggers: TriggerShareVM[] | EmptyVM;
  heatmap: HeatmapVM;
  progression: ProgressionVM;
}

interface ProgressInput {
  stats: TrainingStats;
  progress: ExerciseProgress;
  /** The unit loads are shown in. */
  unit: WeightUnit;
  /** What was trained in the last 7 days. */
  coverage: Coverage;
  /** What the program trains, to tell a lagging muscle from one never targeted. */
  planned: MuscleVolume;
  /** Today's date key. */
  today: string;
  tab: ProgressTab;
}

function buildHeatmapVM(coverage: Coverage, planned: MuscleVolume): HeatmapVM {
  const trained = MUSCLES.filter((muscle) => coverage(muscle) > 0);
  const ranked = new CoverageReport(coverage, planned)
    .standings(trained)
    .sort((a, b) => b.pct - a.pct);
  return {
    coverage,
    muscles: ranked.length > 0 ? ranked : buildEmptyVM("No sets in the last 7 days."),
  };
}

const PROGRESSION_SUBTITLE = "Trend & personal best";

function buildProgressionVM(progress: ExerciseProgress, unit: WeightUnit): ProgressionVM {
  if (progress.trends.length === 0) {
    const empty = `${NOTHING_LOGGED} Each exercise gets a trend and a personal best after its first session.`;
    return { subtitle: PROGRESSION_SUBTITLE, rows: buildEmptyVM(empty) };
  }
  const rows = progress.trends.map((trend): ProgressionRowVM => {
    const shown = trendIn(trend, unit);
    return {
      exId: trend.exId,
      exercise: progress.nameOf(trend.exId),
      series: shown.series,
      best: formatAmount(shown.best, shown.unit),
      gain: formatGain(shown.gain, shown.unit),
      up: trend.gain >= 0,
    };
  });
  return { subtitle: `${PROGRESSION_SUBTITLE} · click a row for full history`, rows };
}

export function buildProgressVM(input: ProgressInput): ProgressVM {
  const { stats, progress, coverage, planned } = input;
  return {
    kpis: buildKpisVM(stats),
    consistency: buildConsistencyVM(stats, input.today, input.tab),
    completion: buildCompletionVM(stats),
    timeOfDay: buildTimeOfDayVM(stats),
    triggers: buildTriggersVM(stats),
    heatmap: buildHeatmapVM(coverage, planned),
    progression: buildProgressionVM(progress, input.unit),
  };
}
