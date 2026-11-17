import type { TrackingType } from "@nabd/domain";
import {
  TRACKING_KEYS,
  isBodyweightLoaded,
  isTimeBased,
  measureOf,
  needsLoad,
  poolMeasure,
} from "@nabd/domain";
import { exercise, lookupIn } from "../support/builders";

describe("tracking types", () => {
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
