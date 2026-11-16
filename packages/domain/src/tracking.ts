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

/** What a set is counted in: seconds for time-based tracking, reps otherwise. */
export type Measure = "time" | "reps";

/**
 * What a set's load is, if it records one:
 *  - `lifted`: a weight picked up (a bar, a dumbbell, a stack);
 *  - `added`: weight added to the user's own body weight;
 *  - `assistance`: help taken off the user's own body weight — help, not load;
 *  - `none`: the set records no load.
 */
type LoadKind = "lifted" | "added" | "assistance" | "none";

/** How each way of tracking counts a set and what its load is: every predicate below reads this. */
const TRAITS: Record<TrackingType, { measure: Measure; load: LoadKind }> = {
  weight_reps: { measure: "reps", load: "lifted" },
  bodyweight_reps: { measure: "reps", load: "none" },
  weighted_bodyweight: { measure: "reps", load: "added" },
  assisted_bodyweight: { measure: "reps", load: "assistance" },
  duration: { measure: "time", load: "none" },
  weight_duration: { measure: "time", load: "lifted" },
  distance_duration: { measure: "time", load: "none" },
  reps_only: { measure: "reps", load: "none" },
};

/** The logger records a weight value for sets of it. */
export const isWeighted = (t: TrackingType): boolean => TRAITS[t].load !== "none";
/** Its sets are counted in seconds, not reps. */
export const isTimeBased = (t: TrackingType): boolean => TRAITS[t].measure === "time";
/** The load is relative to bodyweight, so a load of zero is the plain exercise. */
export const isBodyweightLoaded = (t: TrackingType): boolean =>
  TRAITS[t].load === "added" || TRAITS[t].load === "assistance";
/** Its "load" is assistance: help, not load, so less of it is harder. */
export const isAssisted = (t: TrackingType): boolean => TRAITS[t].load === "assistance";
/** The exercise cannot be done without picking a load (a bar, a dumbbell, a stack). */
export const needsLoad = (t: TrackingType): boolean => TRAITS[t].load === "lifted";

/** What a set of it is counted in. */
export const measureOf = (t: TrackingType): Measure => TRAITS[t].measure;

/** Time-based amounts are entered and progressed in steps of this many seconds. */
export const SECONDS_STEP = 5;

/** The most a single set can record of each measure; anything above is a typing slip. */
export const MAX_AMOUNT: Record<Measure, number> = { reps: 999, time: 6 * 60 * 60 };
