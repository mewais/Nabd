import type { TrackingType } from "@nabd/domain";
import {
  TRACKING_KEYS,
  TRACK_NAMES,
  isBodyweightLoaded,
  isTimeBased,
  isWeighted,
  measureOf,
  needsLoad,
  poolMeasure,
} from "@nabd/domain";
import { exercise, lookupIn } from "../support/builders";

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

  it("a load on top of bodyweight can be zero; a bar or a dumbbell has to be picked", () => {
    const loads = (key: TrackingType) => ({
      relative: isBodyweightLoaded(key),
      picked: needsLoad(key),
    });
    expect(loads("weighted_bodyweight")).toEqual({ relative: true, picked: false });
    expect(loads("assisted_bodyweight")).toEqual({ relative: true, picked: false });
    expect(loads("weight_reps")).toEqual({ relative: false, picked: true });
    expect(loads("weight_duration")).toEqual({ relative: false, picked: true });
    expect(loads("bodyweight_reps")).toEqual({ relative: false, picked: false });
  });

  it("each is counted in seconds or in reps, and a pool in what its first exercise is", () => {
    expect(TRACKING_KEYS.filter((key) => measureOf(key) === "time")).toEqual(
      TRACKING_KEYS.filter(isTimeBased),
    );
    const plank = exercise({ tracking: "duration" });
    const crunch = exercise({ tracking: "reps_only" });
    const lookup = lookupIn([plank, crunch]);
    expect(poolMeasure([plank.id, crunch.id], lookup)).toBe("time");
    expect(poolMeasure(["gone", crunch.id], lookup)).toBe("reps");
    expect(poolMeasure([], lookup)).toBeNull();
    expect(poolMeasure(["gone"], lookup)).toBeNull();
  });
});
