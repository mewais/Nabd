// The schedule a program runs on: what fits a week, and how switching between
// weekdays and floating keeps today on the day it is on.

import type { Program, Schedule, Weekday } from "@nabd/domain";
import { DAYS_PER_WEEK, inWeekOrder, isWeekday } from "@nabd/domain";

/** Where the plan stands today, for the edits that must not move today: switching schedule. */
export interface PlanToday {
  weekday: Weekday;
  /** The program day today is on; null on a rest day or in an empty plan. */
  dayId: string | null;
}

/**
 * Whether `program` could run on a weekday schedule — with `added` more days,
 * if any: it would have no more days than a week has, one per weekday, as a
 * further day could never come up.
 */
export function fitsWeekdaySchedule(program: Pick<Program, "days">, added = 0): boolean {
  return program.days.length + added <= DAYS_PER_WEEK;
}

/** The weekday `ahead` days after `weekday`. */
function weekdayAfter(weekday: Weekday, ahead: number): Weekday {
  const later = (weekday + ahead) % DAYS_PER_WEEK;
  if (!isWeekday(later)) throw new RangeError(`no weekday ${later}`);
  return later;
}

/**
 * Put `draft` on `schedule`, keeping today on the day it is on. Going floating
 * puts the days in the order they ran through the week, Monday first, and
 * unpins them. Going weekday pins the day the plan is on today to today's
 * weekday and the days after it, in plan order, to the weekdays that follow.
 */
export function reschedule(draft: Program, schedule: Schedule, today: PlanToday): void {
  draft.schedule = schedule;
  if (schedule === "floating") {
    draft.days = inWeekOrder(draft.days);
    for (const day of draft.days) day.weekday = null;
    return;
  }
  const current = Math.max(
    0,
    draft.days.findIndex((d) => d.id === today.dayId),
  );
  const fromToday = [...draft.days.slice(current), ...draft.days.slice(0, current)];
  fromToday.forEach((day, daysAhead) => {
    day.weekday = weekdayAfter(today.weekday, daysAhead);
  });
}
