// Everything the UI can ask the store to do, grouped the way the store is
// built: one interface per slice, implemented by the file of the same name.

import type { AppData, Direction, ExerciseDraft, Settings } from "@nabd/domain";
import type { ProgramEdit } from "@nabd/program-editor";
import type {
  AdviceChoice,
  LibraryState,
  LibraryTarget,
  MapStyle,
  MapView,
  ProgressTab,
  Screen,
} from "@nabd/view";
import type { Confirmation, NabdState } from "./state";

export interface DaySlice {
  /** Load persisted state from the backend and open today. Never rejects (see `loadProblems`). */
  hydrate: () => Promise<void>;
  /**
   * Advance the clock: new time, latest idle reading, day rollover, nudge latch.
   * `systemIdle` says whether the reading is the OS's system-wide one (it can
   * come and go while the app runs) or only what the window itself saw.
   */
  tick: (idleSeconds: number, systemIdle: boolean) => void;
}

export interface NudgeSlice {
  snooze: () => void;
  togglePause: () => void;
}

export interface LoggingSlice {
  /**
   * Open the logger on an exercise (default: the next one due). This answers a
   * pending nudge: the sets logged in the session are attributed to it.
   */
  openSession: (itemId?: string) => void;
  /**
   * Open the logger on an exercise chosen from the library: on the item today
   * already has for it (brought back if it was skipped), so its sets count
   * toward the plan instead of beside it; on a new extra when today has none.
   */
  openSessionOn: (exId: string) => void;
  closeSession: () => void;
  focusItem: (itemId: string) => void;
  stepReps: (direction: Direction) => void;
  /** Step the load by one weight increment. */
  stepWeight: (direction: Direction) => void;
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

export interface PlanSlice {
  /** Change the program; today, the planner's day and the rotation follow the change. */
  editProgram: (edit: ProgramEdit) => void;
  /** Show a day in the planner's editor. */
  selectPlannerDay: (dayId: string) => void;
}

export interface LibrarySlice {
  /** Open the library for `target`, with no search and no filter. */
  openLibrary: (target: LibraryTarget) => void;
  closeLibrary: () => void;
  filterLibrary: (by: Partial<Pick<LibraryState, "search" | "group">>) => void;
  /** Open the custom-exercise form, optionally pre-filled from an existing exercise. */
  startDraft: (copyOf?: string) => void;
  patchDraft: (patch: Partial<ExerciseDraft>) => void;
  cancelDraft: () => void;
  saveDraft: () => void;
  pickExercise: (exId: string) => void;
  deleteCustomExercise: (exId: string) => void;
}

export interface SettingsDataSlice {
  updateSettings: (patch: Partial<Settings>) => void;
  /** Set the body weight typed in the display unit, or forget it (null); out of range is ignored. */
  setBodyWeight: (displayValue: number | null) => void;
  /** Show the Settings dialog. */
  openSettings: () => void;
  closeSettings: () => void;
  exportData: () => Promise<void>;
  /**
   * Read an import file. A file that is not a valid export is reported; a
   * valid one is not applied yet: it replaces what is stored, so the user is
   * asked to confirm first (see ConfirmSlice).
   */
  importData: (json: string) => void;
  /** Replace what is stored with `data`, after backing it up. */
  replaceData: (data: AppData) => Promise<void>;
}

export interface ConfirmSlice {
  /** Ask the user to confirm something that cannot be undone, instead of doing it. */
  ask: (confirmation: Confirmation) => void;
  /** The user's answer: go ahead with what was asked, or drop it. Resolves once it is done. */
  answer: (goAhead: boolean) => Promise<void>;
}

export interface ViewSlice {
  /** Show a screen. The planner opens on today's day (the plan's first day on a rest day). */
  showScreen: (screen: Screen) => void;
  setMapView: (view: MapView) => void;
  setMapStyle: (style: MapStyle) => void;
  setProgressTab: (tab: ProgressTab) => void;
  /** Open the full-history chart of an exercise. */
  openChart: (exId: string) => void;
  closeChart: () => void;
  /** Dismiss the app-level notice. */
  dismissNotice: () => void;
}

export interface DesktopSlice {
  sendTestNotification: () => void;
  /** Exit the app (closing the window only hides it while there is a tray), saving what waits first. */
  quit: () => void;
}

export interface NabdActions
  extends
    DaySlice,
    NudgeSlice,
    LoggingSlice,
    PlanSlice,
    LibrarySlice,
    SettingsDataSlice,
    ConfirmSlice,
    ViewSlice,
    DesktopSlice {}

export type NabdStore = NabdState & NabdActions;
