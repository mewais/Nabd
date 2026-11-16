// The backend behind the UI in a plain browser (no Tauri): in memory, starting
// from the sample plan. Nothing here is on the desktop app's data path.

import { DEFAULT_SETTINGS } from "@nabd/domain";
import { createMemoryBackend } from "@nabd/ipc-client";
import type { IpcClient } from "@nabd/ipc-client";
import { DEMO_PROGRAM, demoHistory } from "./demo-data";

const TICK_MS = 1000;

export function createDemoClient(): IpcClient {
  const { client } = createMemoryBackend(
    { program: DEMO_PROGRAM, settings: DEFAULT_SETTINGS, history: demoHistory(new Date()) },
    // The page itself can be translucent; there is no tray and no OS idle time.
    { tray: false, glass: true, idle: false },
  );
  return {
    ...client,
    // The browser stands in for the backend clock. A visible tab's timers run on time.
    onTick: async (handler) => {
      const timer = window.setInterval(() => handler({ idleSeconds: null }), TICK_MS);
      return () => window.clearInterval(timer);
    },
  };
}
