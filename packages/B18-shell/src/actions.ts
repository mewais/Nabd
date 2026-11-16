import type { Theme } from "@nabd/domain";
import type { Screen } from "./nav-items";

/** What the app chrome asks of the app. */
export interface ShellActions {
  navigate: (screen: Screen) => void;
  /** Pause nudges, or resume them. */
  togglePause: () => void;
  setTheme: (theme: Theme) => void;
  /** Make the window translucent, or solid again. */
  setGlass: (on: boolean) => void;
  openSettings: () => void;
  dismissNotice: () => void;
}
