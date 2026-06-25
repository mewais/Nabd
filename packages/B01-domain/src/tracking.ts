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
export const WEIGHTED_TRACKS: ReadonlySet<TrackingType> = new Set<TrackingType>([
  "weight_reps",
  "weighted_bodyweight",
  "assisted_bodyweight",
  "weight_duration",
]);

/** Tracking types whose primary unit is time (seconds), not reps. */
export const TIME_TRACKS: ReadonlySet<TrackingType> = new Set<TrackingType>([
  "duration",
  "weight_duration",
  "distance_duration",
]);

export const isWeighted = (t: TrackingType): boolean => WEIGHTED_TRACKS.has(t);
export const isTimeBased = (t: TrackingType): boolean => TIME_TRACKS.has(t);
