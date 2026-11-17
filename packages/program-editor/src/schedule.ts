// The schedule a program runs on: what fits a week, and how switching between
// weekdays and floating keeps today on the day it is on.

import type { Day, Program, Schedule, Weekday } from "@nabd/domain";
import { DAYS_PER_WEEK, WEEK_ORDER, inWeekOrder, isFloating, isWeekday } from "@nabd/domain";

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

/** Put `day` of `draft` on `weekday`; a day already there swaps places with it. */
export function pinToWeekday(draft: Program, day: Day, weekday: Weekday): void {
  const occupant = draft.days.find((d) => d.weekday === weekday && d.id !== day.id);
  if (occupant) occupant.weekday = day.weekday;
  day.weekday = weekday;
}

/** The weekday `ahead` days after `weekday`. */
function weekdayAfter(weekday: Weekday, ahead: number): Weekday {
  const later = (weekday + ahead) % DAYS_PER_WEEK;
  if (!isWeekday(later)) throw new RangeError(`no weekday ${later}`);
  return later;
}

/** Run `draft` floating: its days in the order they ran through the week, Monday first, unpinned. */
function runFloating(draft: Program): void {
  draft.schedule = "floating";
  draft.days = inWeekOrder(draft.days);
  for (const day of draft.days) day.weekday = null;
}

/**
 * A weekday plan has one day per weekday, whatever was stored or imported: a
 * day on no weekday, or on one an earlier day already has, moves to the first
 * free weekday after it (from Monday, for a day on none), as it could never
 * come up otherwise. A plan with more days than a week runs floating instead,
 * which keeps every day.
 */
export function keepOneDayPerWeekday(draft: Program): void {
  if (isFloating(draft)) return;
  if (!fitsWeekdaySchedule(draft)) {
    runFloating(draft);
    return;
  }
  const taken = new Set<Weekday>();
  const displaced = draft.days.filter((day) => {
    if (day.weekday === null || taken.has(day.weekday)) return true;
    taken.add(day.weekday);
    return false;
  });
  for (const day of displaced) {
    const from = day.weekday === null ? WEEK_ORDER[0]! : weekdayAfter(day.weekday, 1);
    let weekday = from;
    while (taken.has(weekday)) weekday = weekdayAfter(weekday, 1);
    day.weekday = weekday;
    taken.add(weekday);
  }
}

/**
 * Put `draft` on `schedule`, keeping today on the day it is on. Going floating
 * puts the days in the order they ran through the week, Monday first, and
 * unpins them. Going weekday pins the day the plan is on today to today's
 * weekday and the days after it, in plan order, to the weekdays that follow.
 */
export function reschedule(draft: Program, schedule: Schedule, today: PlanToday): void {
  if (schedule === "floating") {
    runFloating(draft);
    return;
  }
  draft.schedule = schedule;
  const current = Math.max(
    0,
    draft.days.findIndex((d) => d.id === today.dayId),
  );
  const fromToday = [...draft.days.slice(current), ...draft.days.slice(0, current)];
  fromToday.forEach((day, daysAhead) => {
    day.weekday = weekdayAfter(today.weekday, daysAhead);
  });
}
