// The sections of the Progress view model that come straight from the training statistics.

import type { TrainingStats } from "@nabd/analytics";
import type { BarDatum } from "@nabd/design-system";
import type { Trigger } from "@nabd/domain";
import { monthName, monthShort, weekdayInitial } from "@nabd/domain";
import type { CalendarVM, KpiVM, ProgressVM } from "./view-model";

export const NO_SETS = "No sets logged yet.";

/** Sunday first, the way `Date.getDay()` counts. */
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const TRIGGER_ORDER: readonly Trigger[] = ["idle", "timer", "manual"];
const TRIGGER_LABELS: Record<Trigger, string> = {
  idle: "Idle detected",
  timer: "Timer",
  manual: "Manual",
};
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

export function kpis(stats: TrainingStats): KpiVM[] {
  return [
    { label: "Current streak", value: String(stats.streak()), unit: "days" },
    { label: "Completion this wk", value: String(stats.completionThisWeek()), unit: "%" },
    { label: "Sets this week", value: String(stats.setsThisWeek()), unit: "sets" },
    { label: "Active days 30d", value: String(stats.activeDays()), unit: "days" },
  ];
}

export function calendar(stats: TrainingStats, today: Date): CalendarVM {
  return {
    month: `${monthName(today.getMonth())} ${today.getFullYear()}`,
    weekdays: WEEKDAYS.map(weekdayInitial),
    firstWeekday: new Date(today.getFullYear(), today.getMonth(), 1).getDay(),
    cells: stats.calendar(),
  };
}

/** "Nov 9". */
const monthAndDay = (date: Date): string => `${monthShort(date.getMonth())} ${date.getDate()}`;

export function weekly(stats: TrainingStats): BarDatum[] {
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

export function completion(stats: TrainingStats): ProgressVM["completion"] {
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

export function timeOfDay(stats: TrainingStats): ProgressVM["timeOfDay"] {
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

export function triggers(stats: TrainingStats): ProgressVM["triggers"] {
  const mix = stats.triggerMix();
  if (TRIGGER_ORDER.every((trigger) => mix[trigger] === 0)) {
    return { empty: `${NO_SETS} What prompted each set shows up here.` };
  }
  return TRIGGER_ORDER.map((trigger) => ({
    trigger,
    label: TRIGGER_LABELS[trigger],
    pct: mix[trigger],
    share: `${mix[trigger]}%`,
  }));
}
