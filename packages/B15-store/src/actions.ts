// Everything the UI can ask the store to do, grouped the way the store is
// built: one interface per slice, implemented by the file of the same name.

import type { Settings } from "@nabd/domain";
import type { MapStyle, MapView, ProgressTab, Screen } from "@nabd/domain";
import type { ProgramEdit } from "@nabd/program-editor";
import type { ExerciseDraft } from "./exercise-draft";
import type { LibraryState, LibraryTarget, NabdState } from "./state";

export interface DayActions {
  /** Load persisted state from the backend and open today. Never rejects (see `loadProblems`). */
  hydrate: () => Promise<void>;
  /** Advance the clock: new time, latest idle reading, day rollover, nudge latch. */
  tick: (idleSeconds: number) => void;
}

export interface NudgeActions {
  snooze: () => void;
  togglePause: () => void;
}

export interface LoggingActions {
  /**
   * Open the logger on an exercise (default: the next one due). This answers a
   * pending nudge: the sets logged in the session are attributed to it.
   */
  openSession: (itemId?: string) => void;
  closeSession: () => void;
  focusItem: (itemId: string) => void;
  stepReps: (direction: number) => void;
  /** Step the load by one weight increment. */
  stepWeight: (direction: number) => void;
  setReps: (reps: number) => void;
  /** Set the load from a value typed in the display unit. */
  setWeight: (displayValue: number) => void;
  /** Fill the form with the coach's primary or alternative suggestion. */
  applyAdvice: (which: "primary" | "alternative") => void;
  logSet: () => Promise<void>;
  undoSet: (setId: string) => Promise<void>;
  /** Skip (or un-skip) an exercise today; an untouched extra is removed instead. */
  toggleSkip: (itemId: string) => void;
}

export interface PlanActions {
  editProgram: (edit: ProgramEdit) => void;
  selectPlanDay: (dayId: string) => void;
}

export interface LibraryActions {
  openLibrary: (target: LibraryTarget) => void;
  closeLibrary: () => void;
  patchLibrary: (patch: Partial<Pick<LibraryState, "search" | "group">>) => void;
  /** Open the custom-exercise form, optionally pre-filled from an existing exercise. */
  startDraft: (copyOf?: string) => void;
  patchDraft: (patch: Partial<ExerciseDraft>) => void;
  cancelDraft: () => void;
  saveDraft: () => void;
  pickExercise: (exId: string) => void;
  deleteCustomExercise: (exId: string) => void;
}

export interface SettingsDataActions {
  updateSettings: (patch: Partial<Settings>) => void;
  exportData: () => Promise<void>;
  importData: (json: string) => Promise<void>;
}

export interface ViewActions {
  setScreen: (screen: Screen) => void;
  setMapView: (view: MapView) => void;
  setMapStyle: (style: MapStyle) => void;
  setSettingsOpen: (open: boolean) => void;
  setProgressTab: (tab: ProgressTab) => void;
  setChartExercise: (exId: string | null) => void;
  /** Dismiss the app-level notice. */
  dismissNotice: () => void;
}

export interface DesktopActions {
  sendTestNotification: () => void;
  /** Exit the app (closing the window only hides it while there is a tray). */
  quit: () => void;
}

export interface NabdActions
  extends
    DayActions,
    NudgeActions,
    LoggingActions,
    PlanActions,
    LibraryActions,
    SettingsDataActions,
    ViewActions,
    DesktopActions {}

export type NabdStore = NabdState & NabdActions;
