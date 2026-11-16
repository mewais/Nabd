import type { SetSpec, TrackingType } from "@nabd/domain";
import {
  SECONDS_STEP,
  boundedLoad,
  isBodyweightLoaded,
  isTimeBased,
  isWeighted,
  roundKg,
  workingSets,
} from "@nabd/domain";
import { repGoal } from "./advice";
import type { Advice, AdviceRequest, Progression, RepGoal } from "./advice";
import type { ExerciseHistory, Performance } from "./history";
import { MovedLoad, loadFor, prescribedIntensity } from "./intensity";
import type { IntensityWaiting, PrescribedIntensity } from "./intensity";

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
 * Loads are in kg, and every load suggested stays within what the log form
 * takes (`boundedLoad`). For assisted exercises the "load" is the
 * assistance, so progressing means *removing* it.
 */
export class ProgressionAdvisor {
  /**
   * @param loadStepKg the smallest load change the user can make.
   * @param bodyWeightKg the user's body weight, null while unknown: what a
   *   bodyweight exercise's load adds to, so only with it can a %1RM or an
   *   RPE set that load.
   */
  constructor(
    private readonly loadStepKg: number,
    private readonly bodyWeightKg: number | null = null,
  ) {}

  /** Advice for one set, compared against the same set of the previous session. */
  advise({ tracking, prescription, setIndex, history, session }: AdviceRequest): Advice {
    const planned = prescription ? workingSets(prescription) : [];
    const spec = planned[setIndex] ?? planned.at(-1) ?? null;
    const goal = repGoal(spec, tracking);
    /** The set of a session this one is compared against: the same one, else its last. */
    const counterpart = (session: Performance[]): Performance | undefined =>
      session[setIndex] ?? session.at(-1);

    const recent = history.sessionsBefore(session, STALL_SESSIONS);
    const basis = recent[0] && counterpart(recent[0]);
    const stalled =
      recent.length === STALL_SESSIONS &&
      recent.every((session) => (counterpart(session)?.reps ?? goal.lo) < goal.lo);
    const plain =
      basis === undefined
        ? this.startingPoint(tracking, planned[setIndex] ?? null)
        : this.progressFrom(tracking, goal, basis, stalled);

    const asked = prescribedIntensity(prescription, spec);
    return this.steered(plain, tracking, asked, goal, history, session);
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
   * `plain` with the prescribed intensity `asked` brought in. With an
   * estimated one-rep max (from the latest session before `session`) its
   * load becomes the primary target, for the bottom of the rep goal, and
   * double progression's own target the alternative (the alternative it
   * already had when the two agree). Without one the advice stays as it is,
   * and says which intensity it is waiting to use, and for what. A hold, or
   * an exercise with no load, ignores the intensity.
   */
  private steered(
    plain: Progression,
    tracking: TrackingType,
    asked: PrescribedIntensity | null,
    goal: RepGoal,
    history: ExerciseHistory,
    session: string,
  ): Advice {
    const moved = new MovedLoad(tracking, this.bodyWeightKg);
    if (asked === null || !moved.isLift) return { ...plain, intensity: null };
    const max = moved.isMeasurable
      ? history.estimateBefore(session, (set) => moved.of(set))
      : undefined;
    if (max === undefined) {
      return { ...plain, intensity: { ...asked, ...this.waiting(moved, history, session) } };
    }
    const weight = this.intensityLoad(tracking, moved.loadFor(loadFor(asked, max, goal.lo)));
    if (weight === null) return { ...plain, intensity: null };
    const primary: Performance = { reps: goal.lo, weight };
    const agrees = primary.weight === plain.primary.weight && primary.reps === plain.primary.reps;
    const alternative = agrees ? plain.alternative : plain.primary;
    return { ...plain, primary, alternative, intensity: { ...asked, max } };
  }

  /** Why an intensity has no one-rep max to work from yet. */
  private waiting(moved: MovedLoad, history: ExerciseHistory, session: string): IntensityWaiting {
    if (!moved.isMeasurable) return { max: null, waitingFor: "bodyWeight" };
    const hasHistory = history.sessionsBefore(session, 1).length > 0;
    return { max: null, waitingFor: hasHistory ? "load" : "history" };
  }

  /** `kg` on the user's load step. */
  private onStep(kg: number): number {
    return roundKg(Math.round(kg / this.loadStepKg) * this.loadStepKg);
  }

  /** `kg` within the loads a set of `tracking` can be given (see `boundedLoad`). */
  private bounded(tracking: TrackingType, kg: number): number {
    return boundedLoad(kg, tracking, this.loadStepKg);
  }

  /**
   * The load an intensity asks for, on the load step and within bounds. For a
   * bodyweight exercise, whose plain form is no load at all, a load that
   * rounds to nothing is no load worth suggesting: null, and the reps-first
   * advice stands.
   */
  private intensityLoad(tracking: TrackingType, kg: number): number | null {
    const load = this.onStep(kg);
    return load <= 0 && isBodyweightLoaded(tracking) ? null : this.bounded(tracking, load);
  }

  /**
   * The load one step harder or easier; null when the exercise has no load to
   * change, or the load cannot go any further that way (no lighter than one
   * step where a load is needed, no heavier than a set can record).
   * Assistance is help, not load, so for an assisted exercise harder means
   * less of it.
   */
  private stepLoad(
    tracking: TrackingType,
    weight: number | null,
    change: "harder" | "easier",
  ): number | null {
    if (weight === null || !isWeighted(tracking)) return null;
    const adds = (change === "harder") !== (tracking === "assisted_bodyweight");
    const stepped = this.bounded(tracking, weight + (adds ? 1 : -1) * this.loadStepKg);
    const moved = adds ? stepped > weight : stepped < weight;
    return moved ? stepped : null;
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
