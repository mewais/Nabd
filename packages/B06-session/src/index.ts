// @nabd/session — pure session reducer for the two-pane logging modal.
// One set logged per call; stay on the exercise until its sets are done, else
// advance; jump to any exercise; accumulate a receipt; emit coverage delta.
// SKELETON: signatures frozen; bodies throw until implemented.

import type {
  Slot,
  ActiveSession,
  LoggedSet,
  Coverage,
  MuscleKey,
  SessionReceiptItem,
} from "@nabd/domain";

const NI = (): never => {
  throw new Error("not implemented");
};

/** History lookup keyed by exercise id, for suggestions. */
export type HistoryLookup = (exId: string) => import("@nabd/progression").LastResult | null;

/** Open a session focused on a slot. */
export function openSession(_slot: Slot, _history: HistoryLookup): ActiveSession {
  return NI();
}

export interface LogResult {
  /** Updated slots (done/status/result). */
  slots: Slot[];
  /** Next form state (same exercise if sets remain, else next pending, else allDone). */
  session: ActiveSession;
  /** Muscles to bump in coverage for the logged set. */
  coverageMuscles: MuscleKey[];
  /** The persisted record to append to history. */
  logged: Omit<LoggedSet, "id" | "ts" | "date">;
  /** Receipt line for this set. */
  receiptItem: SessionReceiptItem;
}

/** Log exactly one set of the session's current exercise. */
export function logSet(_session: ActiveSession, _slots: Slot[], _history: HistoryLookup): LogResult {
  return NI();
}

/** Switch the active form to another slot (by id), preserving the receipt. */
export function switchExercise(
  _session: ActiveSession,
  _slots: Slot[],
  _slotId: string,
  _history: HistoryLookup,
): ActiveSession {
  return NI();
}

/** Step the reps/seconds value (time-based steps by 5). */
export function stepReps(_session: ActiveSession, _delta: number): ActiveSession {
  return NI();
}

/** Step the weight value by 2.5 kg increments, clamped at 0. */
export function stepWeight(_session: ActiveSession, _delta: number): ActiveSession {
  return NI();
}

/** Apply a coverage delta for a logged set's muscles. */
export function applyCoverage(_cov: Coverage, _muscles: MuscleKey[]): Coverage {
  return NI();
}
