// @nabd/store — the application store: owns state, changes it through the
// domain engines, and persists through the IPC client.

export { createNabdStore } from "./store";
export type { StoreDeps } from "./context";
export type { NabdActions, NabdStore } from "./actions";
export type { NabdState, LibraryState, LibraryTarget, Notice, LoadProblem } from "./state";
export type { ExerciseDraft } from "./exercise-draft";
// The view vocabulary lives in @nabd/domain; offered here beside the state that holds it.
export type { MapStyle, MapView, ProgressTab, Screen } from "@nabd/domain";
export {
  selectCoach,
  selectCoverage,
  selectLibrary,
  selectNudgeStatus,
  selectPendingNudge,
  selectPlannedVolume,
  selectStats,
  selectTodayPlan,
} from "./selectors";
