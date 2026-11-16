import type { IpcClient } from "@nabd/ipc-client";
import { isTauri } from "@nabd/ipc-client";

/** Where "seconds since the user last touched keyboard or mouse" comes from. */
export interface IdleSource {
  read(): Promise<number>;
  dispose(): void;
}

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "wheel", "touchstart"] as const;

/** In a plain browser only activity inside the page can be seen. */
function pageIdleSource(): IdleSource {
  let lastActivity = Date.now();
  const touch = (): void => {
    lastActivity = Date.now();
  };
  for (const event of ACTIVITY_EVENTS) window.addEventListener(event, touch, { passive: true });
  return {
    read: async () => Math.floor((Date.now() - lastActivity) / 1000),
    dispose: () => {
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, touch);
    },
  };
}

/** Under Tauri the OS reports system-wide idle time; a failed read counts as "active". */
function systemIdleSource(client: IpcClient): IdleSource {
  return { read: () => client.getIdleSeconds().catch(() => 0), dispose: () => {} };
}

export function createIdleSource(client: IpcClient): IdleSource {
  return isTauri() ? systemIdleSource(client) : pageIdleSource();
}
