import type {
  DayRecord,
  DayState,
  Equipment,
  Exercise,
  LoggedSet,
  MuscleGroup,
  MuscleKey,
  Program,
  RotationState,
  Settings,
  TrackingType,
} from "@nabd/domain";
import { DEFAULT_SETTINGS, EMPTY_PROGRAM, dateKey } from "@nabd/domain";
import type { LogSession } from "@nabd/session";

export type Screen = "today" | "planner" | "progress";
export type MapView = "both" | "front" | "back";
export type MapStyle = "heat" | "outline";
export type ProgressTab = "calendar" | "weekly";

/** What picking an exercise in the library does. */
export type LibraryTarget =
  /** Add it to a fixed day. */
  | { kind: "exercise"; dayId: string }
  /** Add it to a cycled slot's pool. */
  | { kind: "pool"; dayId: string; slotId: string; muscle: MuscleKey }
  /** Do it today, outside the plan. */
  | { kind: "extra" };

/** The custom-exercise form. */
export interface ExerciseDraft {
  name: string;
  primary: MuscleKey[];
  secondary: MuscleKey[];
  equipment: Equipment;
  tracking: TrackingType;
}

export const EMPTY_DRAFT: ExerciseDraft = {
  name: "",
  primary: [],
  secondary: [],
  equipment: "bodyweight",
  tracking: "weight_reps",
};

/** Exercise-library modal state; `target` null means the modal is closed. */
export interface LibraryState {
  target: LibraryTarget | null;
  search: string;
  group: MuscleGroup | null;
  /** The custom-exercise form, when it is showing. */
  draft: ExerciseDraft | null;
}

/** A short message about the last import/export. */
export interface Notice {
  kind: "info" | "error";
  text: string;
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
  // clock + nudging
  now: Date;
  idleSeconds: number;
  paused: boolean;
  snoozedUntil: Date | null;
  // logging
  session: LogSession | null;
  // view state
  screen: Screen;
  mapView: MapView;
  mapStyle: MapStyle;
  settingsOpen: boolean;
  notice: Notice | null;
  planEditDay: string | null;
  library: LibraryState;
  progressTab: ProgressTab;
  /** Exercise whose full-history chart is open. */
  chartExercise: string | null;
}

export const freshDayState = (now: Date): DayState => ({
  date: dateKey(now),
  floatingIndex: 0,
  skipped: [],
  extras: [],
});

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
    now,
    idleSeconds: 0,
    paused: false,
    snoozedUntil: null,
    session: null,
    screen: "today",
    mapView: "both",
    mapStyle: "heat",
    settingsOpen: false,
    notice: null,
    planEditDay: null,
    library: { target: null, search: "", group: null, draft: null },
    progressTab: "calendar",
    chartExercise: null,
  };
}
