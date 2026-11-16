import type { Prescription, SetSpec, TrackingType } from "@nabd/domain";
import { SECONDS_STEP, isTimeBased, isWeighted, roundKg, workingSets } from "@nabd/domain";
import type { ExerciseHistory, Performance } from "./history";

/** The rep (or seconds) window a set should land in. */
interface RepGoal {
  lo: number;
  hi: number;
}

/** Why the advisor chose its primary target. */
export type AdviceKind =
  /** No history: start at the bottom of the range. */
  | "start"
  /** Below the range last time: same load, reach the bottom of the range. */
  | "reach_range"
  /** Inside the range: one more rep (or a few more seconds) at the same load. */
  | "add_reps"
  /** Topped the range: more load, back to the bottom of the range. */
  | "add_load"
  /** Topped the range with no load to add: keep pushing reps. */
  | "beyond_range"
  /** Missed the range twice running: back the load off one step. */
  | "deload";

export interface Advice {
  kind: AdviceKind;
  primary: Performance;
  /** The other sensible way to progress (e.g. more load instead of one more rep). */
  alternative: Performance | null;
  /** What the advice was based on; null when there is no history. */
  basis: Performance | null;
}

const DEFAULT_REP_GOAL: RepGoal = { lo: 8, hi: 12 };
const DEFAULT_TIME_GOAL: RepGoal = { lo: 30, hi: 30 };
/** Sessions that must miss the range in a row before backing the load off. */
const STALL_SESSIONS = 2;
/** The share of the last working load a first warm-up starts from. */
const WARMUP_SHARE = 0.5;

/** What the advisor is asked about: one set of one exercise in a session. */
interface AdviceRequest {
  tracking: TrackingType;
  /** Null for an exercise done outside the plan. */
  prescription: Prescription | null;
  /** Which set of the session, 0-based, warm-ups excluded. */
  setIndex: number;
  history: ExerciseHistory;
  /** The session's local date key; only earlier sessions are compared against. */
  date: string;
}

/** The goal a prescribed set asks for; a default window when nothing is prescribed. */
function repGoal(spec: SetSpec | null, tracking: TrackingType): RepGoal {
  if (spec === null) return isTimeBased(tracking) ? DEFAULT_TIME_GOAL : DEFAULT_REP_GOAL;
  return { lo: spec.amount, hi: spec.upTo ?? spec.amount };
}

/**
 * Double progression: earn reps inside the prescribed range first, then trade
 * them for load and start again at the bottom of the range.
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
    const goal = repGoal(planned[setIndex] ?? planned.at(-1) ?? null, tracking);
    /** The set of a session this one is compared against: the same one, else its last. */
    const counterpart = (session: Performance[]): Performance | undefined =>
      session[setIndex] ?? session.at(-1);

    const recent = history.sessionsBefore(date, STALL_SESSIONS);
    const basis = recent[0] && counterpart(recent[0]);
    if (basis === undefined) return this.startingPoint(tracking, planned[setIndex] ?? null);

    const stalled =
      recent.length === STALL_SESSIONS &&
      recent.every((session) => (counterpart(session)?.reps ?? goal.lo) < goal.lo);
    return this.progressFrom(tracking, goal, basis, stalled);
  }

  /** Where to begin with no history: the bottom of the range, load still to be found. */
  startingPoint(tracking: TrackingType, spec: SetSpec | null): Advice {
    const goal = repGoal(spec, tracking);
    const weight = isWeighted(tracking) ? 0 : null;
    return { kind: "start", primary: { reps: goal.lo, weight }, alternative: null, basis: null };
  }

  private progressFrom(
    tracking: TrackingType,
    goal: RepGoal,
    basis: Performance,
    stalled: boolean,
  ): Advice {
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
    const steps = Math.round((working.weight * WARMUP_SHARE) / this.loadStepKg);
    return { reps, weight: roundKg(steps * this.loadStepKg) };
  }
}
