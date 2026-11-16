// @nabd/ipc-client — the typed boundary to the native backend. The transport
// (`invoke`) is injected so the client runs without a Tauri runtime in tests.

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

/** The Tauri invoke signature (command name + args → result). */
export type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

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

/** Subscribes to a backend event; resolves to an unsubscribe function. */
export type Listen = <T>(event: string, handler: (payload: T) => void) => Promise<() => void>;

/** The backend counts sets in unsigned integers; anything else would fail the whole call. */
const setCount = (n: number): number => (Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0);

/** Build a client over the given transport. */
export function createIpcClient(invoke: Invoke, listen: Listen): IpcClient {
  return {
    async loadAll() {
      return JSON.parse(await invoke<string>("load_all")) as BootSnapshot;
    },
    save: (key, value) => invoke("save_singleton", { key, value: JSON.stringify(value) }),
    saveMany: (values) =>
      invoke("save_singletons", {
        entries: Object.entries(values).map(([key, value]) => [key, JSON.stringify(value)]),
      }),
    appendSet: (set) => invoke("append_set", { rowJson: JSON.stringify(set) }),
    deleteSet: (id) => invoke("delete_set", { id }),
    exportData: () => invoke("export_data"),
    importData: (data) => invoke("import_data", { json: JSON.stringify(data) }),
    platformCapabilities: () => invoke("platform_capabilities"),
    notify: (reason, exercise) => invoke("notify", { reason, exercise }),
    sendTestNotification: () => invoke("send_test_notification"),
    setGlass: (enabled) => invoke("set_glass", { enabled }),
    setAutostart: (enabled) => invoke("set_autostart", { enabled }),
    updateTray: (state) =>
      invoke("update_tray", {
        state: { ...state, done: setCount(state.done), total: setCount(state.total) },
      }),
    quit: () => invoke("quit"),
    onTick: (handler) => listen<Tick>("tick", handler),
    onTrayAction: (handler) => listen<TrayAction>("tray-action", handler),
  };
}

/** Whether a Tauri runtime is present. */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** The client bound to the real Tauri runtime. */
export function tauriClient(): IpcClient {
  const invoke: Invoke = (cmd, args) =>
    import("@tauri-apps/api/core").then((api) => api.invoke(cmd, args));
  const listen: Listen = <T>(event: string, handler: (payload: T) => void) =>
    import("@tauri-apps/api/event").then((api) =>
      api.listen<T>(event, (e) => handler(e.payload)),
    );
  return createIpcClient(invoke, listen);
}
