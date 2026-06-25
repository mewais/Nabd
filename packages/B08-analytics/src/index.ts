// @nabd/analytics — pure Progress-screen analytics from logged history.
// SKELETON: signatures frozen; bodies throw until implemented.

import type { LoggedSet, Trigger } from "@nabd/domain";

const NI = (): never => {
  throw new Error("not implemented");
};

/** Consecutive-day training streak ending today (or yesterday). */
export function streak(_history: LoggedSet[], _now: Date): number {
  return NI();
}

/** Planned-sets-done completion ratio for the current week, 0–100. */
export function completionThisWeek(_history: LoggedSet[], _plannedPerWeek: number, _now: Date): number {
  return NI();
}

/** Total logged sets in the current week. */
export function setsThisWeek(_history: LoggedSet[], _now: Date): number {
  return NI();
}

/** Distinct active training days in the last 30 days. */
export function activeDays30(_history: LoggedSet[], _now: Date): number {
  return NI();
}

export interface HourBucket {
  hour: number;
  count: number;
}

/** Histogram of logged sets by hour of day, plus the peak hour. */
export function timeOfDay(_history: LoggedSet[]): { buckets: HourBucket[]; peak: number } {
  return NI();
}

/** Percentage split of what triggered logged sets (idle/timer/manual). */
export function triggerMix(_history: LoggedSet[]): Record<Trigger, number> {
  return NI();
}

export interface CalendarCell {
  day: number;
  /** -1 future, 0 none, 1..3 intensity. */
  level: number;
}

/** Month calendar heatmap levels for the month containing `now`. */
export function calendarHeatmap(_history: LoggedSet[], _now: Date): CalendarCell[] {
  return NI();
}

/** Sets per week for the last 8 weeks (oldest first, current last). */
export function weeklyBars(_history: LoggedSet[], _now: Date): number[] {
  return NI();
}

/** Completion percentage for each of the last 7 days (oldest first). */
export function completionLast7(_history: LoggedSet[], _plannedPerDay: number, _now: Date): number[] {
  return NI();
}
