// @nabd/program-editor — every change the planner can make to a program,
// immutably, plus the one-line summary of a day.

export { ProgramEditor } from "./editor";
export type { EditRef, ProgramEdit } from "./editor";
export { daySummary } from "./views";
// Both live in @nabd/domain; still offered here for the screens that import them from this package.
export { WEEK_ORDER } from "@nabd/domain";
export type { ExerciseLookup } from "@nabd/domain";
