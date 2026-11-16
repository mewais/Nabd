// What the Progress screen renders: plain data, every word already written.

import type { Recommendation } from "@nabd/coverage";
import type { BarDatum } from "@nabd/design-system";
import type { Coverage, MuscleKey, Trigger } from "@nabd/domain";

/** The two views of the consistency card. */
export type ConsistencyTab = "calendar" | "weekly";

export interface KpiVM {
  label: string;
  value: string;
  unit: string;
}

/** How much was trained on a calendar day; `future` days have not happened yet. */
export type CalendarLevel = "future" | "none" | "light" | "medium" | "full";

export interface CalendarCellVM {
  day: number;
  level: CalendarLevel;
}

export interface CalendarVM {
  /** "November 2026". */
  month: string;
  /** Column headings, Sunday first. */
  weekdays: readonly string[];
  /** Column of the 1st of the month, 0 = Sunday. */
  firstWeekday: number;
  cells: CalendarCellVM[];
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
  consistency: { calendar: CalendarVM; weekly: BarDatum[] };
  completion: CompletionVM | EmptyVM;
  timeOfDay: TimeOfDayVM | EmptyVM;
  triggers: TriggerShareVM[] | EmptyVM;
  heatmap: HeatmapVM;
  progression: ProgressionRowVM[] | EmptyVM;
}

/** What the screen can ask for. */
export interface ProgressActions {
  setProgressTab: (tab: ConsistencyTab) => void;
  /** Open the full-history chart of an exercise. */
  setChartExercise: (exId: string) => void;
}
