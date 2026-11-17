import type { TrainingStats } from "@nabd/analytics";
import type { BarDatum } from "@nabd/design-system";
import { weekdayInitial, weekdayOf } from "@nabd/domain";
import { buildEmptyVM } from "./empty-vm";
import type { EmptyVM } from "./empty-vm";

export interface CompletionVM {
  /** "50%". */
  weekPct: string;
  days: BarDatum[];
}

/** The share of planned sets that got done: this week, and day by day. */
export function buildCompletionVM(stats: TrainingStats): CompletionVM | EmptyVM {
  const days = stats.completionByDay();
  if (days.every((day) => day.pct === null)) {
    return buildEmptyVM("Nothing planned yet. Completion shows up once a day has planned sets.");
  }
  return {
    weekPct: `${stats.completionThisWeek()}%`,
    days: days.map(({ date, pct }, index) => ({
      label: weekdayInitial(weekdayOf(date)),
      heightPct: pct ?? 0,
      highlight: index === days.length - 1,
    })),
  };
}
