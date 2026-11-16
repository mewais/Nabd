// The sections of the Progress screen that come straight from the training statistics.

import type { CalendarCell, TrainingStats } from "@nabd/analytics";
import type { BarDatum, StatFigure } from "@nabd/design-system";
import type { Trigger } from "@nabd/domain";
import {
  TRIGGERS,
  TRIGGER_NAMES,
  monthName,
  monthShort,
  parseDateKey,
  weekdayInitial,
} from "@nabd/domain";
import type { ProgressTab } from "@nabd/view";
import { NO_SETS } from "./empty-vm";
import type { EmptyVM } from "./empty-vm";

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

/** Sunday first, the way `Date.getDay()` counts. */
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
/** The time-of-day chart captions every third hour; 24 captions do not fit. */
const HOUR_CAPTION_EVERY = 3;

/** "9a", "12p", "6p". */
function hourLabel(hour: number): string {
  return `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? "a" : "p"}`;
}

/** Bar heights relative to the tallest value. */
function relativeHeights(values: readonly number[]): number[] {
  const max = Math.max(...values);
  return values.map((value) => (max === 0 ? 0 : Math.round((value / max) * 100)));
}

export function buildKpisVM(stats: TrainingStats): StatFigure[] {
  return [
    { label: "Current streak", value: String(stats.streak()), unit: "days" },
    { label: "Completion this wk", value: String(stats.completionThisWeek()), unit: "%" },
    { label: "Sets this week", value: String(stats.setsThisWeek()), unit: "sets" },
    { label: "Active days 30d", value: String(stats.activeDays()), unit: "days" },
  ];
}

function buildCalendarVM(stats: TrainingStats, today: Date): CalendarVM {
  return {
    month: `${monthName(today.getMonth())} ${today.getFullYear()}`,
    weekdays: WEEKDAYS.map(weekdayInitial),
    firstWeekday: new Date(today.getFullYear(), today.getMonth(), 1).getDay(),
    cells: stats.calendar(),
  };
}

/** "Nov 9". */
const monthAndDay = (date: Date): string => `${monthShort(date.getMonth())} ${date.getDate()}`;

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

/** `today` is a date key. */
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

export function buildCompletionVM(stats: TrainingStats): CompletionVM | EmptyVM {
  const days = stats.completionByDay();
  if (days.every((day) => day.pct === null)) {
    return { empty: "Nothing planned yet. Completion shows up once a day has planned sets." };
  }
  return {
    weekPct: `${stats.completionThisWeek()}%`,
    days: days.map(({ date, pct }, index) => ({
      label: weekdayInitial(date.getDay()),
      heightPct: pct ?? 0,
      highlight: index === days.length - 1,
    })),
  };
}

export function buildTimeOfDayVM(stats: TrainingStats): TimeOfDayVM | EmptyVM {
  const { buckets, peak } = stats.timeOfDay();
  if (peak === null) return { empty: `${NO_SETS} Your busiest hours show up here.` };
  const heights = relativeHeights(buckets.map((bucket) => bucket.count));
  return {
    peak: `Peak ${hourLabel(peak)}`,
    bars: buckets.map(({ hour }, index) => ({
      label: hour % HOUR_CAPTION_EVERY === 0 ? hourLabel(hour) : "",
      heightPct: heights[index] ?? 0,
      highlight: hour === peak,
    })),
  };
}

export function buildTriggersVM(stats: TrainingStats): TriggerShareVM[] | EmptyVM {
  const mix = stats.triggerMix();
  if (TRIGGERS.every((trigger) => mix[trigger] === 0)) {
    return { empty: `${NO_SETS} What prompted each set shows up here.` };
  }
  return TRIGGERS.map((trigger) => ({
    trigger,
    label: TRIGGER_NAMES[trigger],
    pct: mix[trigger],
    share: `${mix[trigger]}%`,
  }));
}
