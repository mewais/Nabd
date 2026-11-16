import type { SettingsPatch } from "./settings-vm";

export interface SettingsActions {
  /** Apply a change; out-of-range values are ignored by the store. */
  change: (patch: SettingsPatch) => void;
  exportData: () => void;
  /** Ask for a backup file; a valid one is loaded in place of what is stored once the user confirms. */
  importData: () => void;
  /** Raise a sample OS notification. */
  sendTestNotification: () => void;
  /** Exit the app (closing the window only hides it while there is a tray). */
  quit: () => void;
  close: () => void;
}
