import { z } from "zod";

/** The 8 ways a set can be tracked. Drives which inputs the logger shows. */
export const TRACKING_KEYS = [
  "weight_reps",
  "bodyweight_reps",
  "weighted_bodyweight",
  "assisted_bodyweight",
  "duration",
  "weight_duration",
  "distance_duration",
  "reps_only",
] as const;

export type TrackingType = (typeof TRACKING_KEYS)[number];

export const TrackingTypeSchema = z.enum(TRACKING_KEYS);

export const TRACK_NAMES: Record<TrackingType, string> = {
  weight_reps: "Weight & reps",
  bodyweight_reps: "Bodyweight reps",
  weighted_bodyweight: "Weighted bodyweight (+)",
  assisted_bodyweight: "Assisted bodyweight (−)",
  duration: "Duration / hold",
  weight_duration: "Weight & duration",
  distance_duration: "Distance & duration",
  reps_only: "Reps only",
};

/** Tracking types that record a weight value in the logger. */
const WEIGHTED_TRACKS: ReadonlySet<TrackingType> = new Set<TrackingType>([
  "weight_reps",
  "weighted_bodyweight",
  "assisted_bodyweight",
  "weight_duration",
]);

/** Tracking types whose primary unit is time (seconds), not reps. */
const TIME_TRACKS: ReadonlySet<TrackingType> = new Set<TrackingType>([
  "duration",
  "weight_duration",
  "distance_duration",
]);

/** Tracking types whose load is added to (or taken off) the user's own bodyweight. */
const BODYWEIGHT_LOAD_TRACKS: ReadonlySet<TrackingType> = new Set<TrackingType>([
  "weighted_bodyweight",
  "assisted_bodyweight",
]);

export const isWeighted = (t: TrackingType): boolean => WEIGHTED_TRACKS.has(t);
export const isTimeBased = (t: TrackingType): boolean => TIME_TRACKS.has(t);
/** The load is relative to bodyweight, so a load of zero is the plain exercise. */
export const isBodyweightLoaded = (t: TrackingType): boolean => BODYWEIGHT_LOAD_TRACKS.has(t);
/** The exercise cannot be done without picking a load (a bar, a dumbbell, a stack). */
export const needsLoad = (t: TrackingType): boolean => isWeighted(t) && !isBodyweightLoaded(t);

/** What a set is counted in: seconds for time-based tracking, reps otherwise. */
export type Measure = "time" | "reps";
export const measureOf = (t: TrackingType): Measure => (isTimeBased(t) ? "time" : "reps");

/** Time-based amounts are entered and progressed in steps of this many seconds. */
export const SECONDS_STEP = 5;

/** The most a single set can record of each measure; anything above is a typing slip. */
export const MAX_AMOUNT: Record<Measure, number> = { reps: 999, time: 6 * 60 * 60 };
