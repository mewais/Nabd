// How the logger words where a session stands in the calendar.

import { addDays, monthShort, parseDateKey, weekdayName, weekdayOf } from "@nabd/domain";
import type { TodayPlan } from "@nabd/scheduling";

const SUBTITLE = "One set, or as many as you have time for — switch exercises freely.";
/** Within a week, a weekday names a day unambiguously; beyond, the date does. */
const DAYS_NAMED_BY_WEEKDAY = 6;

/** "Monday's", within the week before `today`; "Nov 2's" further back. */
function dayPossessive(dateKey: string, today: string): string {
  const date = parseDateKey(dateKey);
  const recent = addDays(date, DAYS_NAMED_BY_WEEKDAY) >= parseDateKey(today);
  const name = recent
    ? weekdayName(weekdayOf(date))
    : `${monthShort(date.getMonth())} ${date.getDate()}`;
  return `${name}'s`;
}

/** What the logger says under its title: which earlier day it continues, if it does. */
export function sessionSubtitle(plan: TodayPlan): string {
  if (plan.continuesFrom === null) return SUBTITLE;
  const day = plan.dayName ?? "day";
  return `Continuing ${dayPossessive(plan.continuesFrom, plan.date)} ${day} — what was done then counts.`;
}
