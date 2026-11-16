import type { SetSpec, TrackingType } from "@nabd/domain";
import { SECONDS_STEP, isAssisted, isTimeBased, isWeighted, workingSets } from "@nabd/domain";
import { repGoal } from "./advice";
import type { Advice, AdviceRequest, Progression, RepGoal } from "./advice";
import type { Performance } from "./history";
import { prescribedIntensity } from "./intensity";
import { LoadSteps } from "./load-steps";
import { IntensitySteering } from "./steering";

/** Sessions that must miss the range in a row before backing the load off. */
const STALL_SESSIONS = 2;
/** The share of the last working load a first warm-up starts from. */
const WARMUP_SHARE = 0.5;

/**
 * Double progression: earn reps inside the prescribed range first, then trade
 * them for load and start again at the bottom of the range. Where the plan
 * prescribes an RPE or a %1RM and there is a one-rep max to measure it
 * against, the load follows that instead (see {@link IntensitySteering}).
 *
 * Loads are in kg, and every load suggested stays within what the log form
 * takes (`boundedLoad`). For assisted exercises the "load" is the
 * assistance, so progressing means *removing* it.
 */
export class ProgressionAdvisor {
  private readonly steps: LoadSteps;
  private readonly steering: IntensitySteering;

  /**
   * @param loadStepKg the smallest load change the user can make.
   * @param bodyWeightKg the user's body weight, null while unknown: what a
   *   bodyweight exercise's load adds to, so only with it can a %1RM or an
   *   RPE set that load.
   */
  constructor(loadStepKg: number, bodyWeightKg: number | null = null) {
    this.steps = new LoadSteps(loadStepKg);
    this.steering = new IntensitySteering(this.steps, bodyWeightKg);
  }

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
    return this.steering.steer(plain, { tracking, asked, goal, history, session });
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
    const harder = this.steps.step(tracking, basis.weight, "harder");
    const moreLoad = (reps: number): Performance | null =>
      harder === null ? null : { reps, weight: harder };

    if (basis.reps < goal.lo) {
      const easier = stalled ? this.steps.step(tracking, basis.weight, "easier") : null;
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
   * Where a warm-up starts when no warm-up of the exercise is on record but a
   * working set is: half of that set's load, rounded to the load step, for the
   * prescribed reps (the working set's own, with nothing prescribed).
   * Assistance stays as it was: halving it would make the warm-up the harder set.
   */
  warmupFrom(tracking: TrackingType, working: Performance, spec: SetSpec | null): Performance {
    const reps = spec?.amount ?? working.reps;
    if (working.weight === null || isAssisted(tracking)) return { reps, weight: working.weight };
    return { reps, weight: this.steps.onStep(working.weight * WARMUP_SHARE) };
  }
}
