import type {
  AppData,
  DayRecord,
  DayState,
  Exercise,
  LoggedSet,
  PlatformCapabilities,
  Program,
  RotationState,
  Settings,
} from "@nabd/domain";

/** The singleton blobs the backend stores, by key. */
export interface Singletons {
  program: Program;
  settings: Settings;
  customExercises: Exercise[];
  rotationState: RotationState;
  dayState: DayState;
  dayLog: DayRecord[];
}

/** Every singleton key: what the backend's store accepts (its KV_KEYS). */
export const SINGLETON_KEYS = Object.keys({
  program: true,
  settings: true,
  customExercises: true,
  rotationState: true,
  dayState: true,
  dayLog: true,
} satisfies Record<keyof Singletons, true>) as (keyof Singletons)[];

/** What the backend holds at boot: each singleton (null if never saved) + history. */
export type BootSnapshot = { [K in keyof Singletons]: unknown } & {
  history: unknown[];
  /** Stored sets the backend could not read at all, and so left out of `history`. */
  unreadableSets?: number;
};

/** Why an export file is written: because the user asked, or to keep what an import replaces. */
type ExportPurpose = "manual" | "before_import";

/** What the tray menu shows. */
interface TrayState {
  nextExercise: string | null;
  done: number;
  total: number;
  paused: boolean;
}

/**
 * Tray menu actions the backend forwards to the frontend, which owns the
 * workout state — and, for "quit", whatever is still waiting to be saved.
 */
export type TrayAction = "start" | "pause" | "quit";

/** An OS notification. */
interface DesktopNotification {
  title: string;
  body: string;
}

/** One beat of the backend's one-second clock. */
export interface Tick {
  /** Seconds since the last keyboard/mouse input anywhere; null when the OS cannot tell. */
  idleSeconds: number | null;
}

export interface IpcClient {
  loadAll(): Promise<BootSnapshot>;
  save<K extends keyof Singletons>(key: K, value: Singletons[K]): Promise<void>;
  /** Save several singletons in one transaction: all of them or none. */
  saveMany(values: Partial<Singletons>): Promise<void>;
  appendSet(set: LoggedSet): Promise<void>;
  deleteSet(id: string): Promise<void>;
  /** Write an export file, named for its `purpose`; resolves to where it was saved. */
  exportData(purpose: ExportPurpose): Promise<string>;
  importData(data: AppData): Promise<void>;
  platformCapabilities(): Promise<PlatformCapabilities>;
  /** Tell the user a set is due: raise `notification` and un-hide a window hidden in the tray. */
  notifyNudge(notification: DesktopNotification): Promise<void>;
  sendTestNotification(): Promise<void>;
  /**
   * Put the native backdrop effect behind the window, or take it off again.
   * The tint and its opacity are the frontend's own paint, so there is nothing
   * else to tell the backend.
   */
  setGlass(enabled: boolean): Promise<void>;
  /** Create or remove the login entry; safe to repeat at every boot. */
  setAutostart(enabled: boolean): Promise<void>;
  updateTray(state: TrayState): Promise<void>;
  /** Exit the app (closing the window only hides it while there is a tray). */
  quit(): Promise<void>;
  /** Subscribe to the one-second clock; resolves to an unsubscribe function. */
  onTick(handler: (tick: Tick) => void): Promise<() => void>;
  /** Subscribe to tray menu actions; resolves to an unsubscribe function. */
  onTrayAction(handler: (action: TrayAction) => void): Promise<() => void>;
}
