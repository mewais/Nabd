import type { Prescription, SetSpec, TrackingType } from "@nabd/domain";
import { isTimeBased, isWeighted } from "@nabd/domain";
import type { ExerciseHistory, Performance } from "./history";

/** The rep (or seconds) window a set should land in. */
export interface RepGoal {
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
const SECONDS_STEP = 5;
/** Sessions that must miss the range in a row before backing the load off. */
const STALL_SESSIONS = 2;

/** The goal a prescribed set asks for; a default window when nothing is prescribed. */
export function repGoal(spec: SetSpec | null, tracking: TrackingType): RepGoal {
  if (spec === null) return isTimeBased(tracking) ? DEFAULT_TIME_GOAL : DEFAULT_REP_GOAL;
  return { lo: spec.a, hi: spec.b ?? spec.a };
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

  /**
   * Advice for set number `setIndex` (0-based, warm-ups excluded) of a session
   * on `date`, compared against the same set of the previous session.
   */
  advise(
    tracking: TrackingType,
    prescription: Prescription | null,
    setIndex: number,
    history: ExerciseHistory,
    date: string,
  ): Advice {
    const workingSets = prescription?.sets.filter((s) => s.type !== "warmup") ?? [];
    const goal = repGoal(workingSets[setIndex] ?? workingSets.at(-1) ?? null, tracking);
    const recent = history.sessionsBefore(date, STALL_SESSIONS);
    const basis = recent[0]?.[setIndex] ?? recent[0]?.at(-1) ?? null;
    if (basis === null) return this.startingPoint(tracking, workingSets[setIndex] ?? null);

    const stalled =
      recent.length === STALL_SESSIONS &&
      recent.every((session) => (session[setIndex] ?? session.at(-1)!).reps < goal.lo);
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
    const harder = this.harderLoad(tracking, basis.weight);
    const moreLoad = (reps: number): Performance | null =>
      harder === null ? null : { reps, weight: harder };

    if (basis.reps < goal.lo) {
      const easier = stalled ? this.easierLoad(tracking, basis.weight) : null;
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

  /** One step harder, or null when this exercise has no load to change. */
  private harderLoad(tracking: TrackingType, weight: number | null): number | null {
    if (weight === null || !isWeighted(tracking)) return null;
    if (tracking !== "assisted_bodyweight") return roundKg(weight + this.loadStepKg);
    return weight > 0 ? roundKg(Math.max(0, weight - this.loadStepKg)) : null;
  }

  /** One step easier, or null when the load cannot go any lower. */
  private easierLoad(tracking: TrackingType, weight: number | null): number | null {
    if (weight === null || !isWeighted(tracking)) return null;
    if (tracking === "assisted_bodyweight") return roundKg(weight + this.loadStepKg);
    return weight > 0 ? roundKg(Math.max(0, weight - this.loadStepKg)) : null;
  }
}

const roundKg = (kg: number): number => Math.round(kg * 1000) / 1000;
