// @nabd/program-editor — every change the planner can make to a program,
// immutably, plus the one-line summary of a day.

export { ProgramEditor, WEEKDAY_SLOTS, fitsWeekdaySchedule } from "./editor";
export type { EditRef, ProgramEdit } from "./editor";
export { daySummary } from "./views";
