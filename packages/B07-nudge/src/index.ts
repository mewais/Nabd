// @nabd/nudge — pure idle+timer nudge engine.
// SKELETON: signatures frozen; bodies throw until implemented.

import type { Slot } from "@nabd/domain";

const NI = (): never => {
  throw new Error("not implemented");
};

export type NudgeReason = "timer" | "idle";

export interface Notif {
  slot: Slot;
  reason: NudgeReason;
  label: string;
}

export interface NudgeState {
  secondsToNext: number;
  idleSeconds: number;
  idleNudge: number;
  /** Whether a modal/notif is currently open (suppresses new notifs). */
  busy: boolean;
  notif: Notif | null;
}

export interface TickInput {
  state: NudgeState;
  currentSlot: Slot | null;
}

/**
 * Advance one second: decrement secondsToNext (floored at 0), increment
 * idleSeconds. Raise a notif when secondsToNext hits 0 OR idleSeconds >=
 * idleNudge (timer wins ties), unless busy or a notif already exists or there is
 * no current slot.
 */
export function tick(_input: TickInput): NudgeState {
  return NI();
}

/** Build the due-notification for a reason + slot. */
export function dueNotif(_reason: NudgeReason, _slot: Slot): Notif {
  return NI();
}

/** Reset the idle counter to 0. */
export function resetIdle(_state: NudgeState): NudgeState {
  return NI();
}

/** Snooze: clear notif, set timer to snooze length, reset idle. */
export function snooze(_state: NudgeState, _snoozeSec: number): NudgeState {
  return NI();
}

/** Reset the timer to the full interval (after a set is logged). */
export function resetTimer(_state: NudgeState, _intervalMin: number): NudgeState {
  return NI();
}
