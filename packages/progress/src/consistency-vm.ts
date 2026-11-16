import type { CalendarCell, TrainingStats } from "@nabd/analytics";
import type { BarDatum } from "@nabd/design-system";
import { WEEKDAYS, monthAndDay, monthName, parseDateKey, weekdayInitial } from "@nabd/domain";
import type { ProgressTab } from "@nabd/view";
import { relativeHeights } from "./bars";

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

function buildCalendarVM(stats: TrainingStats, today: Date): CalendarVM {
  return {
    month: `${monthName(today.getMonth())} ${today.getFullYear()}`,
    weekdays: WEEKDAYS.map(weekdayInitial),
    firstWeekday: new Date(today.getFullYear(), today.getMonth(), 1).getDay(),
    cells: stats.calendar(),
  };
}

function buildWeeklyVM(stats: TrainingStats): BarDatum[] {
  const weeks = stats.weeklySets();
  const heights = relativeHeights(weeks.map((week) => week.sets));
  return weeks.map((week, index) => {
    const current = index === weeks.length - 1;
    return {
      label: current ? "This wk" : monthAndDay(week.weekStart),
      heightPct: heights[index] ?? 0,
      value: week.sets > 0 ? String(week.sets) : undefined,
      highlight: current,
    };
  });
}

/** How regularly sets get logged; `today` is a date key. */
export function buildConsistencyVM(
  stats: TrainingStats,
  today: string,
  tab: ProgressTab,
): ConsistencyVM {
  return {
    tab,
    calendar: buildCalendarVM(stats, parseDateKey(today)),
    weekly: buildWeeklyVM(stats),
  };
}
