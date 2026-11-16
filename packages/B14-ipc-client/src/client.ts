import type {
  AppData,
  DayRecord,
  DayState,
  Exercise,
  LoggedSet,
  Program,
  RotationState,
  Settings,
} from "@nabd/domain";
import type { NudgeReason } from "@nabd/nudge";

/** The singleton blobs the backend stores, by key. */
export interface Singletons {
  program: Program;
  settings: Settings;
  customExercises: Exercise[];
  rotationState: RotationState;
  dayState: DayState;
  dayLog: DayRecord[];
}

/** What the backend holds at boot: each singleton (null if never saved) + history. */
export type BootSnapshot = { [K in keyof Singletons]: unknown } & { history: unknown[] };

/** What the tray menu shows. */
export interface TrayState {
  nextExercise: string | null;
  done: number;
  total: number;
  paused: boolean;
}

/** Tray menu actions the backend forwards to the frontend. */
export type TrayAction = "start" | "pause";

/** What this machine can do; features it lacks are not offered. */
export interface PlatformCapabilities {
  /** A tray icon exists, so closing the window hides it there instead of quitting. */
  tray: boolean;
  /** The window can be translucent ("Glass"). */
  glass: boolean;
  /** The OS reports system-wide idle time. */
  idle: boolean;
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
  /** Write the export file; resolves to where it was saved. */
  exportData(): Promise<string>;
  importData(data: AppData): Promise<void>;
  platformCapabilities(): Promise<PlatformCapabilities>;
  /** Raise the OS notification for a due set (and un-hide a window hidden in the tray). */
  notify(reason: NudgeReason, exercise: string): Promise<void>;
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
