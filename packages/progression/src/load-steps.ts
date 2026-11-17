import type { TrackingType } from "@nabd/domain";
import { boundedLoad, isAssisted, isWeighted, roundKg } from "@nabd/domain";

/** One step harder or easier: more load, or less (for an assisted exercise, the other way round). */
type LoadChange = "harder" | "easier";

/** Loads as the user can set them: on their load step, and within what a set can be given. */
export class LoadSteps {
  /** @param stepKg the smallest load change the user can make. */
  constructor(readonly stepKg: number) {}

  /** `kg` on the load step. */
  onStep(kg: number): number {
    return roundKg(Math.round(kg / this.stepKg) * this.stepKg);
  }

  /** `kg` within the loads a set of `tracking` can be given (see `boundedLoad`). */
  bounded(tracking: TrackingType, kg: number): number {
    return boundedLoad(kg, tracking, this.stepKg);
  }

  /**
   * The load one step harder or easier; null when the exercise has no load to
   * change, or the load cannot go any further that way (no lighter than one
   * step where a load is needed, no heavier than a set can record).
   * Assistance is help, not load, so for an assisted exercise harder means
   * less of it.
   */
  step(tracking: TrackingType, weight: number | null, change: LoadChange): number | null {
    if (weight === null || !isWeighted(tracking)) return null;
    const adds = (change === "harder") !== isAssisted(tracking);
    const stepped = this.bounded(tracking, weight + (adds ? 1 : -1) * this.stepKg);
    const moved = adds ? stepped > weight : stepped < weight;
    return moved ? stepped : null;
  }
}
