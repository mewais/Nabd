import type { IpcClient } from "@nabd/ipc-client";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "wheel", "touchstart"] as const;

/** How long since the user last did something inside this page. */
class PageActivity {
  private lastActivity = Date.now();
  private readonly touch = (): void => {
    this.lastActivity = Date.now();
  };

  constructor() {
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, this.touch, { passive: true });
    }
  }

  idleSeconds(): number {
    return Math.floor((Date.now() - this.lastActivity) / 1000);
  }

  dispose(): void {
    for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, this.touch);
  }
}

/**
 * The app clock: calls `onTick` once a second with the seconds since the
 * user's last keyboard or mouse input, and whether that is the OS's
 * system-wide figure. Returns a function that stops it.
 *
 * The beat comes from the backend (`client.onTick`), not from a timer here: the
 * desktop app spends most of its life hidden in the tray, where a webview's
 * timers are throttled. The idle time is the OS's system-wide figure when it
 * has one; when it does not (no backend for this desktop, or the browser demo),
 * activity inside the page is the best available stand-in — never a silent
 * "always active".
 */
export function startAppClock(
  client: IpcClient,
  onTick: (idleSeconds: number, systemIdle: boolean) => void,
): () => void {
  const page = new PageActivity();
  const subscription = client.onTick(({ idleSeconds }) =>
    onTick(idleSeconds ?? page.idleSeconds(), idleSeconds !== null),
  );
  return () => {
    void subscription.then((unsubscribe) => unsubscribe());
    page.dispose();
  };
}
