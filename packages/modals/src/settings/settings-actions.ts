import type { SettingsPatch } from "./rows-vm";

export interface SettingsActions {
  /** Apply a change; out-of-range values are ignored by the store. */
  change: (patch: SettingsPatch) => void;
  /** The body weight typed, in the display unit; null when the field was emptied. */
  setBodyWeight: (value: number | null) => void;
  exportData: () => void;
  /** Ask for a backup file; a valid one is loaded in place of what is stored once the user confirms. */
  importData: () => void;
  /** Raise a sample OS notification. */
  sendTestNotification: () => void;
  /** Exit the app (closing the window only hides it while there is a tray). */
  quit: () => void;
  close: () => void;
}
