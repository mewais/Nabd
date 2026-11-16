import type { Prescription, SetSpec, TrackingType } from "@nabd/domain";
import { isTimeBased, isWeighted } from "@nabd/domain";
import { loadForReps } from "./epley";

/** How hard a prescribed set should be: an RPE (5–10) or a percentage (40–100) of the one-rep max. */
export interface PrescribedIntensity {
  kind: "rpe" | "pct";
  value: number;
}

/**
 * What a piece of advice made of the intensity its set prescribes: `max` is
 * the estimated one-rep max, in kg, its load was worked out from — null while
 * there is none, when the advice is plain double progression.
 */
export interface IntensityBasis extends PrescribedIntensity {
  max: number | null;
}

/**
 * Whether a prescribed intensity can steer the load of an exercise: only a
 * load that is lifted, not held for time or taken off (assistance is help,
 * not a share of anyone's max).
 */
export const steersLoad = (tracking: TrackingType): boolean =>
  isWeighted(tracking) && !isTimeBased(tracking) && tracking !== "assisted_bodyweight";

/** The standard relationship between effort and reps held back: RIR = 10 − RPE. */
export const repsInReserve = (rpe: number): number => 10 - rpe;

/** The intensity `spec` prescribes in `prescription`; null when load is not prescribed. */
export function prescribedIntensity(
  prescription: Pick<Prescription, "intensity"> | null,
  spec: SetSpec | null,
): PrescribedIntensity | null {
  if (prescription === null || prescription.intensity === "none") return null;
  if (spec?.intensity === undefined) return null;
  return { kind: prescription.intensity, value: spec.intensity };
}

/**
 * The load, in kg and not yet rounded, that `intensity` asks for given a
 * one-rep max of `max`, for sets of `reps`: that share of it, or the load at
 * which `reps` leave the prescribed reps in reserve (Epley, as in the trends).
 */
export function loadFor(intensity: PrescribedIntensity, max: number, reps: number): number {
  if (intensity.kind === "pct") return (max * intensity.value) / 100;
  return loadForReps(max, reps + repsInReserve(intensity.value));
}
