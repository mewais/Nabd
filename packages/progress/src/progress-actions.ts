import type { ProgressTab } from "@nabd/view";

/** What the Progress screen asks of the app. */
export interface ProgressActions {
  /** Show the calendar or the weekly view of the consistency card. */
  setTab: (tab: ProgressTab) => void;
  /** Open the full-history chart of an exercise. */
  openChart: (exId: string) => void;
}
