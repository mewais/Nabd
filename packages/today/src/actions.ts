import type { MapStyle, MapView } from "@nabd/domain";

/** What the Today screen asks of the app. */
export interface TodayActions {
  /** Open the logger on the next set, or on one exercise of the queue. */
  start: (itemId?: string) => void;
  snooze: () => void;
  /** Log an exercise that is not in today's plan. */
  logOther: () => void;
  /** Skip an exercise for today, bring a skipped one back, or drop an untouched extra. */
  toggleSkip: (itemId: string) => void;
  setMapView: (view: MapView) => void;
  setMapStyle: (style: MapStyle) => void;
}
