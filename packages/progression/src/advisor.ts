import type { SetSpec, TrackingType } from "@nabd/domain";
import {
  SECONDS_STEP,
  isBodyweightLoaded,
  isTimeBased,
  isWeighted,
  roundKg,
  workingSets,
} from "@nabd/domain";
import { repGoal } from "./advice";
import type { Advice, AdviceRequest, Progression, RepGoal } from "./advice";
import type { Performance } from "./history";
import { loadFor, prescribedIntensity, steersLoad } from "./intensity";
import type { PrescribedIntensity } from "./intensity";

/** Sessions that must miss the range in a row before backing the load off. */
const STALL_SESSIONS = 2;
/** The share of the last working load a first warm-up starts from. */
const WARMUP_SHARE = 0.5;

/**
 * Double progression: earn reps inside the prescribed range first, then trade
 * them for load and start again at the bottom of the range. Where the plan
 * prescribes an RPE or a %1RM and there is a one-rep max to measure it
 * against, the load follows that instead (see {@link Advice}).
 *
 * Loads are in kg. For assisted exercises the "load" is the assistance, so
 * progressing means *removing* it.
 */
export class ProgressionAdvisor {
  /** @param loadStepKg the smallest load change the user can make. */
  constructor(private readonly loadStepKg: number) {}

  /** Advice for one set, compared against the same set of the previous session. */
  advise({ tracking, prescription, setIndex, history, date }: AdviceRequest): Advice {
    const planned = prescription ? workingSets(prescription) : [];
    const spec = planned[setIndex] ?? planned.at(-1) ?? null;
    const goal = repGoal(spec, tracking);
    /** The set of a session this one is compared against: the same one, else its last. */
    const counterpart = (session: Performance[]): Performance | undefined =>
      session[setIndex] ?? session.at(-1);

    const recent = history.sessionsBefore(date, STALL_SESSIONS);
    const basis = recent[0] && counterpart(recent[0]);
    const stalled =
      recent.length === STALL_SESSIONS &&
      recent.every((session) => (counterpart(session)?.reps ?? goal.lo) < goal.lo);
    const plain =
      basis === undefined
        ? this.startingPoint(tracking, planned[setIndex] ?? null)
        : this.progressFrom(tracking, goal, basis, stalled);

    const intensity = steersLoad(tracking) ? prescribedIntensity(prescription, spec) : null;
    return this.steered(plain, tracking, intensity, goal, history.estimateBefore(date));
  }

  /** Where to begin with no history: the bottom of the range, load still to be found. */
  startingPoint(tracking: TrackingType, spec: SetSpec | null): Advice {
    const goal = repGoal(spec, tracking);
    const weight = isWeighted(tracking) ? 0 : null;
    const primary = { reps: goal.lo, weight };
    return { kind: "start", primary, alternative: null, basis: null, intensity: null };
  }

  private progressFrom(
    tracking: TrackingType,
    goal: RepGoal,
    basis: Performance,
    stalled: boolean,
  ): Progression {
    const repStep = isTimeBased(tracking) ? SECONDS_STEP : 1;
    const moreReps: Performance = { reps: basis.reps + repStep, weight: basis.weight };
    const harder = this.stepLoad(tracking, basis.weight, "harder");
    const moreLoad = (reps: number): Performance | null =>
      harder === null ? null : { reps, weight: harder };

    if (basis.reps < goal.lo) {
      const easier = stalled ? this.stepLoad(tracking, basis.weight, "easier") : null;
      return easier === null
        ? { kind: "reach_range", primary: { ...basis, reps: goal.lo }, alternative: null, basis }
        : { kind: "deload", primary: { reps: goal.lo, weight: easier }, alternative: null, basis };
    }
    if (basis.reps >= goal.hi) {
      const primary = moreLoad(goal.lo);
      return primary === null
        ? { kind: "beyond_range", primary: moreReps, alternative: null, basis }
        : { kind: "add_load", primary, alternative: moreReps, basis };
    }
    return { kind: "add_reps", primary: moreReps, alternative: moreLoad(basis.reps), basis };
  }

  /**
   * `plain` with the prescribed `intensity` brought in. With an estimated
   * one-rep max `max` its load becomes the primary target, for the bottom of
   * the rep goal, and double progression's own target the alternative (the
   * alternative it already had when the two agree). Without one the advice
   * stays as it is, and says which intensity it is waiting to use.
   */
  private steered(
    plain: Progression,
    tracking: TrackingType,
    intensity: PrescribedIntensity | null,
    goal: RepGoal,
    max: number | undefined,
  ): Advice {
    if (intensity === null) return { ...plain, intensity: null };
    if (max === undefined) return { ...plain, intensity: { ...intensity, max: null } };
    const weight = this.intensityLoad(tracking, loadFor(intensity, max, goal.lo));
    if (weight === null) return { ...plain, intensity: null };
    const primary: Performance = { reps: goal.lo, weight };
    const agrees = primary.weight === plain.primary.weight && primary.reps === plain.primary.reps;
    const alternative = agrees ? plain.alternative : plain.primary;
    return { ...plain, primary, alternative, intensity: { ...intensity, max } };
  }

  /** `kg` on the user's load step. */
  private onStep(kg: number): number {
    return roundKg(Math.round(kg / this.loadStepKg) * this.loadStepKg);
  }

  /**
   * The load an intensity asks for, on the load step and never below one step.
   * For a bodyweight exercise, whose plain form is no load at all, a load that
   * rounds to nothing is no load worth suggesting: null, and the reps-first
   * advice stands.
   */
  private intensityLoad(tracking: TrackingType, kg: number): number | null {
    const load = this.onStep(kg);
    if (load > 0) return load;
    return isBodyweightLoaded(tracking) ? null : this.loadStepKg;
  }

  /**
   * The load one step harder or easier; null when the exercise has no load to
   * change, or the load cannot go any lower. Assistance is help, not load, so
   * for an assisted exercise harder means less of it.
   */
  private stepLoad(
    tracking: TrackingType,
    weight: number | null,
    change: "harder" | "easier",
  ): number | null {
    if (weight === null || !isWeighted(tracking)) return null;
    const adds = (change === "harder") !== (tracking === "assisted_bodyweight");
    if (adds) return roundKg(weight + this.loadStepKg);
    return weight > 0 ? roundKg(Math.max(0, weight - this.loadStepKg)) : null;
  }

  /**
   * Where a warm-up starts when no warm-up of the exercise is on record but a
   * working set is: half of that set's load, rounded to the load step, for the
   * prescribed reps (the working set's own, with nothing prescribed).
   * Assistance stays as it was: halving it would make the warm-up the harder set.
   */
  warmupFrom(tracking: TrackingType, working: Performance, spec: SetSpec | null): Performance {
    const reps = spec?.amount ?? working.reps;
    if (working.weight === null || tracking === "assisted_bodyweight") {
      return { reps, weight: working.weight };
    }
    return { reps, weight: this.onStep(working.weight * WARMUP_SHARE) };
  }
}
