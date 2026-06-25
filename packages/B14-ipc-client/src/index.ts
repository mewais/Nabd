// @nabd/ipc-client — typed wrappers over the Tauri IPC commands (B13 + B23
// native commands). A pluggable transport (the `invoke` function) is injected so
// tests can run without a Tauri runtime.

import type {
  Program,
  Settings,
  Theme,
  Exercise,
  LoggedSet,
  RotationState,
  DayState,
} from "@nabd/domain";

/** The Tauri invoke signature (cmd name + args → result). Injectable for tests. */
export type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

/** Boot snapshot returned by `load_all` (singletons parsed; history array). */
export interface BootSnapshot {
  program: Program | null;
  settings: Settings | null;
  theme: Theme | null;
  customExercises: Exercise[] | null;
  rotationState: RotationState | null;
  dayState: DayState | null;
  history: LoggedSet[];
}

/** The client surface the store uses. */
export interface IpcClient {
  init(): Promise<void>;
  loadAll(): Promise<BootSnapshot>;
  saveSingleton(key: string, value: unknown): Promise<void>;
  appendSet(row: LoggedSet): Promise<void>;
  exportData(): Promise<string>;
  importData(json: string): Promise<void>;
  // native (no-ops/handled in the binary; thin invoke wrappers here)
  notify(reason: "timer" | "idle", exercise: string): Promise<void>;
  setVibrancy(opacity: number): Promise<void>;
  getIdleSeconds(): Promise<number>;
}

/** Build a client over an injected invoke transport (used in tests + app). */
export function createIpcClient(invoke: Invoke): IpcClient {
  return {
    init(): Promise<void> {
      return invoke("init");
    },

    async loadAll(): Promise<BootSnapshot> {
      const raw = await invoke<string>("load_all");
      const {
        program = null,
        settings = null,
        theme = null,
        customExercises = null,
        rotationState = null,
        dayState = null,
        history = [],
      } = JSON.parse(raw) as {
        program?: Program | null;
        settings?: Settings | null;
        theme?: Theme | null;
        customExercises?: Exercise[] | null;
        rotationState?: RotationState | null;
        dayState?: DayState | null;
        history?: LoggedSet[];
      };
      return { program, settings, theme, customExercises, rotationState, dayState, history };
    },

    saveSingleton(key: string, value: unknown): Promise<void> {
      return invoke("save_singleton", { key, value: JSON.stringify(value) });
    },

    appendSet(row: LoggedSet): Promise<void> {
      return invoke("append_set", { rowJson: JSON.stringify(row) });
    },

    exportData(): Promise<string> {
      return invoke("export_data");
    },

    importData(json: string): Promise<void> {
      return invoke("import_data", { json });
    },

    notify(reason: "timer" | "idle", exercise: string): Promise<void> {
      return invoke("notify", { reason, exercise });
    },

    setVibrancy(opacity: number): Promise<void> {
      return invoke("set_vibrancy", { opacity });
    },

    getIdleSeconds(): Promise<number> {
      return invoke("get_idle_seconds");
    },
  };
}

/** Whether a Tauri runtime is present (window.__TAURI_INTERNALS__). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * The real transport: dynamically uses @tauri-apps/api `invoke` when running in
 * Tauri, else a no-op/throwing fallback for plain-web/test contexts.
 */
export function tauriInvoke(): Invoke {
  if (isTauri()) {
    return <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => import("@tauri-apps/api/core").then(({ invoke }) => invoke<T>(cmd, args));
  }
  return <T>(_cmd: string, _args?: Record<string, unknown>): Promise<T> =>
    Promise.reject(new Error("tauri unavailable"));
}

/** Default client bound to the real Tauri transport. */
export function defaultClient(): IpcClient {
  return createIpcClient(tauriInvoke());
}
