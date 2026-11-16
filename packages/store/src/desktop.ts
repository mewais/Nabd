// The parts of the operating system the app reaches through the backend.

import type { DesktopActions } from "./actions";
import type { StoreContext } from "./context";

/** Create or remove the login entry. */
export function applyAutostart({ attempt, client }: StoreContext, enabled: boolean): void {
  void attempt("change start at login", () => client.setAutostart(enabled));
}

/** Put the translucent backdrop behind the window, or take it off. */
export function applyGlass({ attempt, client }: StoreContext, enabled: boolean): void {
  void attempt("change the translucent window", () => client.setGlass(enabled));
}

export function desktopActions({ attempt, client }: StoreContext): DesktopActions {
  return {
    sendTestNotification: () =>
      void attempt("send a notification", () => client.sendTestNotification()),
    quit: () => void attempt("quit", () => client.quit()),
  };
}
