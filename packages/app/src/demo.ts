// The backend behind the UI in a plain browser (no Tauri): in memory, starting
// from the sample plan. Nothing here is on the desktop app's data path.

import { DEFAULT_SETTINGS } from "@nabd/domain";
import { createMemoryBackend } from "@nabd/ipc-client";
import type { BootSnapshot, IpcClient } from "@nabd/ipc-client";
import { DEMO_PROGRAM, demoHistory } from "./demo-data";

const TICK_MS = 1000;

declare global {
  interface Window {
    /**
     * The end-to-end tests' one seam: what the demo backend holds at boot,
     * instead of the sample plan. Set it before the page loads (Playwright's
     * `addInitScript`); `{}` is a first run with nothing stored. Only this
     * browser demo reads it — the desktop app never builds a demo backend.
     */
    __NABD_E2E_SNAPSHOT__?: Partial<BootSnapshot>;
  }
}

/** What the demo starts with: the sample plan and its history, unless a test supplied its own data. */
function initialData(): Partial<BootSnapshot> {
  return (
    window.__NABD_E2E_SNAPSHOT__ ?? {
      program: DEMO_PROGRAM,
      settings: DEFAULT_SETTINGS,
      history: demoHistory(new Date()),
    }
  );
}

export function createDemoClient(): IpcClient {
  const { client } = createMemoryBackend(
    initialData(),
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
