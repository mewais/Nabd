// @nabd/scheduling — pure scheduling engine: resolve today's day, cycled
// rotation, slot building, statuses, out-of-order start, day rollover.
// SKELETON: signatures frozen; bodies throw until implemented.

import type {
  Program,
  Day,
  Slot,
  Exercise,
  RotationState,
  DayState,
} from "@nabd/domain";

const NI = (): never => {
  throw new Error("not implemented");
};

export type ExerciseLookup = (exId: string) => Exercise | undefined;

/** Progress needed to resolve floating-day index across days. */
export interface ScheduleContext {
  rotationState: RotationState;
  floatingIndex: number;
}

/**
 * Which program Day applies on `date`. Weekday schedule -> the day whose weekday
 * matches (or null if none/rest). Floating -> days[floatingIndex % days.length].
 */
export function resolveTodayDay(
  _program: Program,
  _date: Date,
  _ctx: ScheduleContext,
): Day | null {
  return NI();
}

/** The exercise id a cycled slot rotates to, given its rotation pointer. */
export function rotationFor(_slotId: string, _pool: string[], _rotation: RotationState): string | null {
  return NI();
}

/**
 * Expand a Day into today's rhythm slots (one Slot per exercise occurrence;
 * cycled slots resolve their rotated exercise). Times start at DEFAULTS.startMin
 * spaced by `intervalMin`. All slots start status "upcoming".
 */
export function buildSlots(
  _day: Day,
  _lookup: ExerciseLookup,
  _rotation: RotationState,
  _intervalMin: number,
): Slot[] {
  return NI();
}

/** Apply done/now/upcoming statuses given how many leading slots are complete. */
export function applyStatuses(_slots: Slot[], _doneCount: number): Slot[] {
  return NI();
}

/** Mark a specific slot as the active "now" (out-of-order start). */
export function startOutOfOrder(_slots: Slot[], _slotId: string): Slot[] {
  return NI();
}

/** The current actionable slot: first "now", else first "upcoming", else null. */
export function currentSlot(_slots: Slot[]): Slot | null {
  return NI();
}

/**
 * End-of-day rollover: unfinished slots -> "skipped" (kept for history),
 * advance cycled rotation by one per trained group, advance floatingIndex if the
 * day was completed. Returns the next day's fresh DayState scaffold + new
 * rotation/floating context.
 */
export function rollover(
  _program: Program,
  _prev: DayState,
  _ctx: ScheduleContext,
  _nextDate: Date,
): { rotationState: RotationState; floatingIndex: number; skipped: Slot[] } {
  return NI();
}

/** Advance cycled rotation pointers for the groups trained in `day`. */
export function advanceRotation(_day: Day, _rotation: RotationState): RotationState {
  return NI();
}
