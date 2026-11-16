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

export interface IpcClient {
  loadAll(): Promise<BootSnapshot>;
  save<K extends keyof Singletons>(key: K, value: Singletons[K]): Promise<void>;
  appendSet(set: LoggedSet): Promise<void>;
  deleteSet(id: string): Promise<void>;
  /** Write the export file; resolves to where it was saved. */
  exportData(): Promise<string>;
  importData(data: AppData): Promise<void>;
  notify(reason: NudgeReason, exercise: string): Promise<void>;
  setVibrancy(opacity: number): Promise<void>;
  setAutostart(enabled: boolean): Promise<void>;
  updateTray(state: TrayState): Promise<void>;
  /** Seconds since the last OS-wide keyboard/mouse input. */
  getIdleSeconds(): Promise<number>;
  /** Subscribe to tray menu actions; resolves to an unsubscribe function. */
  onTrayAction(handler: (action: TrayAction) => void): Promise<() => void>;
}

/** Subscribes to a backend event; resolves to an unsubscribe function. */
export type Listen = <T>(event: string, handler: (payload: T) => void) => Promise<() => void>;

/** Build a client over the given transport. */
export function createIpcClient(invoke: Invoke, listen: Listen): IpcClient {
  return {
    async loadAll() {
      return JSON.parse(await invoke<string>("load_all")) as BootSnapshot;
    },
    save: (key, value) => invoke("save_singleton", { key, value: JSON.stringify(value) }),
    appendSet: (set) => invoke("append_set", { rowJson: JSON.stringify(set) }),
    deleteSet: (id) => invoke("delete_set", { id }),
    exportData: () => invoke("export_data"),
    importData: (data) => invoke("import_data", { json: JSON.stringify(data) }),
    notify: (reason, exercise) => invoke("notify", { reason, exercise }),
    setVibrancy: (opacity) => invoke("set_vibrancy", { opacity }),
    setAutostart: (enabled) => invoke("set_autostart", { enabled }),
    updateTray: (state) => invoke("update_tray", { state }),
    getIdleSeconds: () => invoke("get_idle_seconds"),
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
  const listen: Listen = (event, handler) =>
    import("@tauri-apps/api/event").then((api) =>
      api.listen(event, (e) => handler(e.payload as never)),
    );
  return createIpcClient(invoke, listen);
}
