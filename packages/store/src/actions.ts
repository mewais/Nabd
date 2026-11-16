// Everything the UI can ask the store to do, grouped the way the store is
// built: one interface per slice, implemented by the file of the same name.

import type {
  AdviceChoice,
  AppData,
  ExerciseDraft,
  MapStyle,
  MapView,
  ProgressTab,
  Screen,
  Settings,
} from "@nabd/domain";
import type { ProgramEdit } from "@nabd/program-editor";
import type { Confirmation, LibraryState, LibraryTarget, NabdState } from "./state";

export interface DayActions {
  /** Load persisted state from the backend and open today. Never rejects (see `loadProblems`). */
  hydrate: () => Promise<void>;
  /**
   * Advance the clock: new time, latest idle reading, day rollover, nudge latch.
   * `systemIdle` says whether the reading is the OS's system-wide one (it can
   * come and go while the app runs) or only what the window itself saw.
   */
  tick: (idleSeconds: number, systemIdle: boolean) => void;
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
  /** Set the reps (or seconds) from a typed value; one a set cannot have is ignored. */
  setReps: (reps: number) => void;
  /** Set the load from a value typed in the display unit; one a set cannot have is ignored. */
  setWeight: (displayValue: number) => void;
  /** Fill the form with the coach's primary or alternative suggestion. */
  applyAdvice: (which: AdviceChoice) => void;
  logSet: () => Promise<void>;
  undoSet: (setId: string) => Promise<void>;
  /** Skip (or un-skip) an exercise today; an untouched extra is removed instead. */
  toggleSkip: (itemId: string) => void;
}

export interface PlanActions {
  /** Change the program; today, the planner's open day and the rotation follow the change. */
  editProgram: (edit: ProgramEdit) => void;
  selectPlanDay: (dayId: string) => void;
}

export interface LibraryActions {
  /** Open the library for `target`, with no search and no filter. */
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
  /**
   * Read an import file. A file that is not a valid export is reported; a
   * valid one is not applied yet: it replaces what is stored, so the user is
   * asked to confirm first (see ConfirmActions).
   */
  importData: (json: string) => void;
  /** Replace what is stored with `data`, after backing it up. */
  replaceData: (data: AppData) => Promise<void>;
}

export interface ConfirmActions {
  /** Ask the user to confirm something that cannot be undone, instead of doing it. */
  ask: (confirmation: Confirmation) => void;
  /** The user's answer: go ahead with what was asked, or drop it. Resolves once it is done. */
  answer: (goAhead: boolean) => Promise<void>;
}

export interface ViewActions {
  /** Show a screen. The planner opens on today's day (the first day on a rest day). */
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
  /** Exit the app (closing the window only hides it while there is a tray), saving what waits first. */
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
    ConfirmActions,
    ViewActions,
    DesktopActions {}

export type NabdStore = NabdState & NabdActions;
