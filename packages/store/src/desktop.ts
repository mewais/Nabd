import type { StoreContext } from "./context";
import type { DesktopSlice } from "./slices";

/** The parts of the desktop the user reaches for directly. */
export function desktopSlice({ attempt, client, flushSets }: StoreContext): DesktopSlice {
  return {
    sendTestNotification: () =>
      void attempt("send a notification", () => client.sendTestNotification()),
    // Whatever is still waiting to be saved gets one last try; quitting does not wait on its luck.
    quit: () => void flushSets().then(() => attempt("quit", () => client.quit())),
  };
}
