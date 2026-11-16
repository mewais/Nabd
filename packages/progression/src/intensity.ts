import type { Prescription, SetSpec, TrackingType } from "@nabd/domain";
import { isAssisted, isBodyweightLoaded, isTimeBased, isWeighted } from "@nabd/domain";
import { loadForReps } from "./epley";
import type { Performance } from "./history";

/** How hard a prescribed set should be: an RPE or a percentage of the one-rep max (see `INTENSITY_SCALES`). */
export interface PrescribedIntensity {
  kind: "rpe" | "pct";
  value: number;
}

/**
 * What an intensity that cannot set the load yet is waiting for: any history
 * at all, a session that moved a load, or the user's body weight (which a
 * bodyweight exercise's load is added to, or taken off).
 */
export type IntensityWait = "history" | "load" | "bodyWeight";

/** No one-rep max to work an intensity's load out from, and why. */
export interface IntensityWaiting {
  max: null;
  waitingFor: IntensityWait;
}

/**
 * What a piece of advice made of the intensity its set prescribes: `max` is
 * the estimated one-rep max, in kg, its load was worked out from — null while
 * there is none, when the advice is plain double progression and `waitingFor`
 * says why.
 */
export type IntensityBasis = PrescribedIntensity & ({ max: number } | IntensityWaiting);

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

/**
 * What a set of an exercise moves in all, as far as a one-rep max goes. A
 * lifted load counts as it is. A bodyweight exercise moves the user's body
 * weight with its load added (or, as assistance, taken off), so it can be
 * measured only once that body weight is known. A hold is not a lift at all.
 */
export class MovedLoad {
  constructor(
    private readonly tracking: TrackingType,
    /** The user's body weight in kg; null when they have not said. */
    private readonly bodyWeightKg: number | null,
  ) {}

  /** Whether the exercise lifts a load that a prescribed intensity could set. */
  get isLift(): boolean {
    return isWeighted(this.tracking) && !isTimeBased(this.tracking);
  }

  /** Whether what it moves can be measured: a lift, with the body weight known where it counts. */
  get isMeasurable(): boolean {
    return this.isLift && (this.bodyWeightKg !== null || !isBodyweightLoaded(this.tracking));
  }

  /** +1 where the load adds to the body weight, -1 where it is assistance taken off. */
  private get sign(): number {
    return isAssisted(this.tracking) ? -1 : 1;
  }

  /** `set` with its load as the weight moved in all. */
  of(set: Performance): Performance {
    if (!isBodyweightLoaded(this.tracking)) return set;
    return { ...set, weight: (this.bodyWeightKg ?? 0) + this.sign * (set.weight ?? 0) };
  }

  /** The load (or assistance) to set for `movedKg` in all: the inverse of {@link of}. */
  loadFor(movedKg: number): number {
    if (!isBodyweightLoaded(this.tracking)) return movedKg;
    return this.sign * (movedKg - (this.bodyWeightKg ?? 0));
  }
}
