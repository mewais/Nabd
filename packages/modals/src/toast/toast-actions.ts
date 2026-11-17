/** What the nudge toast asks of the app. */
export interface ToastActions {
  /** Open the logger on the set the nudge is about. */
  start: () => void;
  snooze: () => void;
  /** Skip the rest of today: no more nudges until tomorrow. */
  skipToday: () => void;
}
