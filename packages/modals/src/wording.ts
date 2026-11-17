// What the dialogs say: their components' words, and how the logger words where
// a session stands in the calendar.

import { APP_NAME, addDays, monthAndDay, parseDateKey, weekdayName, weekdayOf } from "@nabd/domain";
import type { TodayPlan } from "@nabd/scheduling";

/** What the dialogs' components say. */
export const WORDS = {
  // The logger.
  logSets: "Log sets",
  thisBreak: "This break",
  done: "Done",
  todaysExercises: "Today's exercises",
  somethingElse: "+ Something else",
  logThisSet: "Log this set",
  loggedToday: "Logged today",
  notSavedYet: "NOT SAVED YET",
  // The nudge toast.
  letsGo: "Let's go",
  snooze: "Snooze",
  // The library.
  searchPlaceholder: "Search exercises…",
  search: "Search exercises",
  muscleGroup: "Muscle group",
  createCustom: "Create custom exercise",
  custom: "CUSTOM",
  duplicate: "Duplicate & edit",
  deleteCustom: "Delete custom exercise",
  exerciseName: "Exercise name",
  primaryMuscles: "Primary muscles",
  tracking: "How to track it",
  equipment: "Equipment",
  secondaryMuscles: "Secondary muscles",
  create: "Create",
  back: "Back",
  // The history chart.
  fullHistory: "Full history",
  // Settings.
  workday: "Workday",
  nudges: "Nudges",
  training: "Training",
  weightUnit: "Weight unit",
  weightUnitHint: "Show and enter weights in this unit.",
  bodyWeight: "Body weight",
  appearance: "Appearance",
  themeHint: "Sets text & contrast.",
  startup: "Startup",
  notifications: "Notifications",
  desktopNotification: "Desktop notification",
  desktopNotificationHint: `A set due while ${APP_NAME} is in the background is announced by your desktop.`,
  testNotification: "Send test notification",
  data: "Data",
  exportData: "Export data",
  importData: "Import data",
  quit: `Quit ${APP_NAME}`,
} as const;

const SUBTITLE = "One set, or as many as you have time for — switch exercises freely.";
/** Within a week, a weekday names a day unambiguously; beyond, the date does. */
const DAYS_NAMED_BY_WEEKDAY = 6;

/** "Monday's", within the week before `today`; "Nov 2's" further back. */
function dayPossessive(dateKey: string, today: string): string {
  const date = parseDateKey(dateKey);
  const recent = addDays(date, DAYS_NAMED_BY_WEEKDAY) >= parseDateKey(today);
  return `${recent ? weekdayName(weekdayOf(date)) : monthAndDay(date)}'s`;
}

/** What the logger says under its title: which earlier day it continues, if it does. */
export function sessionSubtitle(plan: TodayPlan): string {
  if (plan.continuesFrom === null) return SUBTITLE;
  const day = plan.dayName ?? "day";
  return `Continuing ${dayPossessive(plan.continuesFrom, plan.date)} ${day} — what was done then counts.`;
}
