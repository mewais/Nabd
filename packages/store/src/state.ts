import type {
  DayRecord,
  DayState,
  Exercise,
  ExerciseDraft,
  LoggedSet,
  MapStyle,
  MapView,
  MuscleGroup,
  MuscleKey,
  Notice,
  Program,
  ProgressTab,
  RotationState,
  Screen,
  Settings,
} from "@nabd/domain";
import { DEFAULT_SETTINGS, EMPTY_PROGRAM, freshDayState } from "@nabd/domain";
import type { PlatformCapabilities, Singletons } from "@nabd/ipc-client";
import type { PendingNudge } from "@nabd/nudge";
import type { LogSession } from "@nabd/session";

/** What picking an exercise in the library does. */
export type LibraryTarget =
  /** Add it to a fixed day. */
  | { kind: "exercise"; dayId: string }
  /** Add it to a cycled slot's pool. */
  | { kind: "pool"; dayId: string; slotId: string; muscle: MuscleKey }
  /** Do it today, outside the plan. */
  | { kind: "extra" };

/** Exercise-library modal state; `target` null means the modal is closed. */
export interface LibraryState {
  target: LibraryTarget | null;
  search: string;
  group: MuscleGroup | null;
  /** The custom-exercise form, when it is showing. */
  draft: ExerciseDraft | null;
}

/**
 * Something stored that could not be read at boot. The app runs on a default
 * in its place, but never saves over the stored copy: an unreadable value may
 * still be recoverable, and overwriting it with a default would destroy it.
 */
export interface LoadProblem {
  /** One stored value, rows of the set history, or everything (the load itself failed). */
  source: keyof Singletons | "history" | "everything";
  detail: string;
}

export interface NabdState {
  booted: boolean;
  // persisted
  settings: Settings;
  program: Program;
  customExercises: Exercise[];
  rotationState: RotationState;
  dayState: DayState;
  dayLog: DayRecord[];
  history: LoggedSet[];
  /** What this computer can do; nothing platform-dependent is offered until the backend has said. */
  capabilities: PlatformCapabilities;
  /** What could not be read at boot; saving is blocked for each of these (see LoadProblem). */
  loadProblems: LoadProblem[];
  // clock + nudging
  now: Date;
  idleSeconds: number;
  /** Mirrors `dayState.paused`, which is the persisted copy. */
  paused: boolean;
  snoozedUntil: Date | null;
  /** Since when there has been work to nudge about (see NudgeContext.activeSince). */
  activeSince: Date | null;
  /** The nudge waiting for an answer; a new object each time one fires. */
  pendingNudge: PendingNudge | null;
  // logging
  session: LogSession | null;
  // view state
  screen: Screen;
  mapView: MapView;
  mapStyle: MapStyle;
  settingsOpen: boolean;
  /** The outcome of the last import/export, shown in Settings. */
  notice: Notice | null;
  /** Something the user must know wherever they are: unreadable data, a failed save. */
  appNotice: Notice | null;
  planEditDay: string | null;
  library: LibraryState;
  progressTab: ProgressTab;
  /** Exercise whose full-history chart is open. */
  chartExercise: string | null;
}

export function initialState(now: Date): NabdState {
  return {
    booted: false,
    settings: DEFAULT_SETTINGS,
    program: EMPTY_PROGRAM,
    customExercises: [],
    rotationState: {},
    dayState: freshDayState(now),
    dayLog: [],
    history: [],
    capabilities: { tray: false, glass: false, idle: false },
    loadProblems: [],
    now,
    idleSeconds: 0,
    paused: false,
    snoozedUntil: null,
    activeSince: null,
    pendingNudge: null,
    session: null,
    screen: "today",
    mapView: "both",
    mapStyle: "heat",
    settingsOpen: false,
    notice: null,
    appNotice: null,
    planEditDay: null,
    library: { target: null, search: "", group: null, draft: null },
    progressTab: "calendar",
    chartExercise: null,
  };
}
