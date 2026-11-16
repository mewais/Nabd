import type { BootSnapshot, IpcClient, PlatformCapabilities } from "./client";

/** A backend that lives in memory, with what it holds open to inspection. */
export interface MemoryBackend {
  client: IpcClient;
  /** What a real backend would have on disk; the client reads and writes it. */
  data: BootSnapshot;
}

const NO_CAPABILITIES: PlatformCapabilities = { tray: false, glass: false, idle: false };

const idOf = (row: unknown): unknown =>
  typeof row === "object" && row !== null && "id" in row ? row.id : undefined;

/**
 * A stand-in for the native backend that stores like the real one and has no
 * desktop behind it: the OS calls do nothing, and no clock ticks or tray
 * actions ever arrive. The browser demo and the store's tests run on it.
 */
export function createMemoryBackend(
  initial: Partial<BootSnapshot> = {},
  capabilities: PlatformCapabilities = NO_CAPABILITIES,
): MemoryBackend {
  const data: BootSnapshot = {
    program: null,
    settings: null,
    customExercises: null,
    rotationState: null,
    dayState: null,
    dayLog: null,
    history: [],
    ...initial,
  };
  const client: IpcClient = {
    loadAll: async () => structuredClone(data),
    save: async (key, value) => {
      data[key] = structuredClone(value);
    },
    saveMany: async (values) => {
      Object.assign(data, structuredClone(values));
    },
    appendSet: async (set) => {
      data.history.push(set);
    },
    deleteSet: async (id) => {
      data.history = data.history.filter((row) => idOf(row) !== id);
    },
    exportData: async () => "memory (nothing is written)",
    importData: async ({ app: _app, version: _version, exportedAt: _exportedAt, ...contents }) => {
      Object.assign(data, structuredClone(contents));
    },
    platformCapabilities: async () => capabilities,
    notifyNudge: async () => {},
    sendTestNotification: async () => {},
    setGlass: async () => {},
    setAutostart: async () => {},
    updateTray: async () => {},
    quit: async () => {},
    onTick: async () => () => {},
    onTrayAction: async () => () => {},
  };
  return { client, data };
}
