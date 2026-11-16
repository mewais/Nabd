// The client over Tauri's IPC. The transport (`invoke`, `listen`) is injected,
// so the command mapping can be exercised without a Tauri runtime.

import { APPDATA_VERSION } from "@nabd/domain";
import type { BootSnapshot, IpcClient, Tick, TrayAction } from "./client";

/** The Tauri invoke signature (command name + args → result). */
export type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

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
    exportData: (purpose) => invoke("export_data", { version: APPDATA_VERSION, purpose }),
    importData: (data) => invoke("import_data", { json: JSON.stringify(data) }),
    platformCapabilities: () => invoke("platform_capabilities"),
    notifyNudge: (notification) => invoke("notify_nudge", { notification }),
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
    import("@tauri-apps/api/event").then((api) => api.listen<T>(event, (e) => handler(e.payload)));
  return createIpcClient(invoke, listen);
}
