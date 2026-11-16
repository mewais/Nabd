import type { Prescription, SetSpec, TrackingType } from "@nabd/domain";
import { isTimeBased } from "@nabd/domain";
import type { ExerciseHistory, Performance } from "./history";
import type { IntensityBasis } from "./intensity";

/** The rep (or seconds) window a set should land in. */
export interface RepGoal {
  lo: number;
  hi: number;
}

/** Why the advisor chose its double-progression target. */
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

/** What double progression alone makes of a set. */
export interface Progression {
  kind: AdviceKind;
  primary: Performance;
  /** The other sensible way to progress (e.g. more load instead of one more rep). */
  alternative: Performance | null;
  /** What the advice was based on; null when there is no history. */
  basis: Performance | null;
}

/**
 * Double progression, with the load the set's prescribed intensity asks for in
 * its place when it can be worked out: `primary` is then that load, `kind` and
 * `alternative` keep to double progression, so the plain option stays on offer.
 */
export interface Advice extends Progression {
  /** The prescribed RPE or %1RM and what became of it; null when none steers the load. */
  intensity: IntensityBasis | null;
}

const DEFAULT_REP_GOAL: RepGoal = { lo: 8, hi: 12 };
const DEFAULT_TIME_GOAL: RepGoal = { lo: 30, hi: 30 };

/** What the advisor is asked about: one set of one exercise in a session. */
export interface AdviceRequest {
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
export function repGoal(spec: SetSpec | null, tracking: TrackingType): RepGoal {
  if (spec === null) return isTimeBased(tracking) ? DEFAULT_TIME_GOAL : DEFAULT_REP_GOAL;
  return { lo: spec.amount, hi: spec.upTo ?? spec.amount };
}
