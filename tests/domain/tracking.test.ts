import type { TrackingType } from "@nabd/domain";
import { TRACKING_KEYS, TRACK_NAMES, isTimeBased, isWeighted } from "@nabd/domain";

describe("tracking types", () => {
  it("every tracking type has a name", () => {
    for (const key of TRACKING_KEYS) expect(TRACK_NAMES[key], key).toBeTruthy();
  });

  it("each says whether it records a load and whether it is measured in time", () => {
    const expected: Record<TrackingType, { weighted: boolean; timed: boolean }> = {
      weight_reps: { weighted: true, timed: false },
      bodyweight_reps: { weighted: false, timed: false },
      weighted_bodyweight: { weighted: true, timed: false },
      assisted_bodyweight: { weighted: true, timed: false },
      duration: { weighted: false, timed: true },
      weight_duration: { weighted: true, timed: true },
      distance_duration: { weighted: false, timed: true },
      reps_only: { weighted: false, timed: false },
    };
    for (const key of TRACKING_KEYS) {
      expect({ weighted: isWeighted(key), timed: isTimeBased(key) }, key).toEqual(expected[key]);
    }
  });
});
