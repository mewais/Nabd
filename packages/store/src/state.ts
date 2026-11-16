import type { LoggedSet, PlatformCapabilities } from "@nabd/domain";
import { DEFAULT_SETTINGS, EMPTY_PROGRAM, NO_CAPABILITIES, freshDayState } from "@nabd/domain";
import type { Singletons } from "@nabd/ipc-client";
import type { PendingNudge } from "@nabd/nudge";
import type { LogSession } from "@nabd/session";
import type {
  Confirmation,
  LibraryState,
  MapStyle,
  MapView,
  Notice,
  ProgressTab,
  Screen,
} from "@nabd/view";

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

/** How each stored thing is named to the user. */
export const STORED_NAMES: Record<LoadProblem["source"], string> = {
  program: "your plan",
  settings: "your settings",
  customExercises: "your custom exercises",
  rotationState: "your exercise rotation",
  dayState: "today's progress",
  dayLog: "your completion log",
  history: "your logged sets",
  everything: "your data",
};

export const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** The two places a notice is shown: the banner over every screen, or Settings → Data. */
export type NoticePlace = "appNotice" | "dataNotice";

/**
 * The app's state. What is persisted comes first: the stored singletons
 * (`dayState`, today's bookkeeping, holds `paused`: nudges are off until the
 * day ends) and the set history.
 */
export interface NabdState extends Singletons {
  booted: boolean;
  history: LoggedSet[];
  /** Ids of logged sets the backend has not accepted yet; they are retried until it does. */
  unsavedSets: string[];
  /** What this computer can do; nothing platform-dependent is offered until the backend has said. */
  capabilities: PlatformCapabilities;
  /** What could not be read at boot; saving is blocked for each of these (see LoadProblem). */
  loadProblems: LoadProblem[];
  // clock + nudging
  now: Date;
  idleSeconds: number;
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
  /** The outcome of the last import or export, shown in Settings. */
  dataNotice: Notice | null;
  /** Something the user must know wherever they are: unreadable data, a failed save. */
  appNotice: Notice | null;
  /** The day open in the planner's editor; null until the planner is opened, or with no days. */
  plannerDayId: string | null;
  library: LibraryState;
  /** The destructive action being confirmed. */
  confirmation: Confirmation | null;
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
    unsavedSets: [],
    capabilities: NO_CAPABILITIES,
    loadProblems: [],
    now,
    idleSeconds: 0,
    snoozedUntil: null,
    activeSince: null,
    pendingNudge: null,
    session: null,
    screen: "today",
    mapView: "both",
    mapStyle: "heat",
    settingsOpen: false,
    dataNotice: null,
    appNotice: null,
    plannerDayId: null,
    library: { target: null, search: "", group: null, draft: null },
    confirmation: null,
    progressTab: "calendar",
    chartExercise: null,
  };
}
