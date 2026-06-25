import { describe, it, expect } from "vitest";
import {
  TRACKING_KEYS,
  TRACK_NAMES,
  WEIGHTED_TRACKS,
  TIME_TRACKS,
  TrackingTypeSchema,
  isWeighted,
  isTimeBased,
} from "@nabd/domain";

describe("tracking.ts", () => {
  it("TRACKING_KEYS has exactly 8 entries", () => {
    expect(TRACKING_KEYS.length).toBe(8);
  });

  it("TRACK_NAMES has a name for every tracking key", () => {
    for (const key of TRACKING_KEYS) {
      expect(TRACK_NAMES).toHaveProperty(key);
      expect(typeof TRACK_NAMES[key]).toBe("string");
      expect(TRACK_NAMES[key].length).toBeGreaterThan(0);
    }
  });

  it("TrackingTypeSchema accepts a valid key", () => {
    const result = TrackingTypeSchema.safeParse("weight_reps");
    expect(result.success).toBe(true);
  });

  it("TrackingTypeSchema rejects an invalid key", () => {
    const result = TrackingTypeSchema.safeParse("something_invalid");
    expect(result.success).toBe(false);
  });

  it("TrackingTypeSchema accepts every key in TRACKING_KEYS", () => {
    for (const key of TRACKING_KEYS) {
      const result = TrackingTypeSchema.safeParse(key);
      expect(result.success).toBe(true);
    }
  });

  describe("isWeighted", () => {
    it("weight_reps → weighted=true, timeBased=false", () => {
      expect(isWeighted("weight_reps")).toBe(true);
      expect(isTimeBased("weight_reps")).toBe(false);
    });

    it("weighted_bodyweight → weighted=true, timeBased=false", () => {
      expect(isWeighted("weighted_bodyweight")).toBe(true);
      expect(isTimeBased("weighted_bodyweight")).toBe(false);
    });

    it("assisted_bodyweight → weighted=true, timeBased=false", () => {
      expect(isWeighted("assisted_bodyweight")).toBe(true);
      expect(isTimeBased("assisted_bodyweight")).toBe(false);
    });

    it("weight_duration → weighted=true, timeBased=true", () => {
      expect(isWeighted("weight_duration")).toBe(true);
      expect(isTimeBased("weight_duration")).toBe(true);
    });

    it("bodyweight_reps → weighted=false, timeBased=false", () => {
      expect(isWeighted("bodyweight_reps")).toBe(false);
      expect(isTimeBased("bodyweight_reps")).toBe(false);
    });

    it("duration → weighted=false, timeBased=true", () => {
      expect(isWeighted("duration")).toBe(false);
      expect(isTimeBased("duration")).toBe(true);
    });

    it("distance_duration → weighted=false, timeBased=true", () => {
      expect(isWeighted("distance_duration")).toBe(false);
      expect(isTimeBased("distance_duration")).toBe(true);
    });

    it("reps_only → weighted=false, timeBased=false", () => {
      expect(isWeighted("reps_only")).toBe(false);
      expect(isTimeBased("reps_only")).toBe(false);
    });
  });

  describe("WEIGHTED_TRACKS set membership", () => {
    it("weight_reps is in WEIGHTED_TRACKS", () => {
      expect(WEIGHTED_TRACKS.has("weight_reps")).toBe(true);
    });

    it("weighted_bodyweight is in WEIGHTED_TRACKS", () => {
      expect(WEIGHTED_TRACKS.has("weighted_bodyweight")).toBe(true);
    });

    it("assisted_bodyweight is in WEIGHTED_TRACKS", () => {
      expect(WEIGHTED_TRACKS.has("assisted_bodyweight")).toBe(true);
    });

    it("weight_duration is in WEIGHTED_TRACKS", () => {
      expect(WEIGHTED_TRACKS.has("weight_duration")).toBe(true);
    });

    it("bodyweight_reps is NOT in WEIGHTED_TRACKS", () => {
      expect(WEIGHTED_TRACKS.has("bodyweight_reps")).toBe(false);
    });

    it("duration is NOT in WEIGHTED_TRACKS", () => {
      expect(WEIGHTED_TRACKS.has("duration")).toBe(false);
    });
  });

  describe("TIME_TRACKS set membership", () => {
    it("duration is in TIME_TRACKS", () => {
      expect(TIME_TRACKS.has("duration")).toBe(true);
    });

    it("weight_duration is in TIME_TRACKS", () => {
      expect(TIME_TRACKS.has("weight_duration")).toBe(true);
    });

    it("distance_duration is in TIME_TRACKS", () => {
      expect(TIME_TRACKS.has("distance_duration")).toBe(true);
    });

    it("weight_reps is NOT in TIME_TRACKS", () => {
      expect(TIME_TRACKS.has("weight_reps")).toBe(false);
    });

    it("reps_only is NOT in TIME_TRACKS", () => {
      expect(TIME_TRACKS.has("reps_only")).toBe(false);
    });
  });
});
