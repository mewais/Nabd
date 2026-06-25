// @nabd/nudge — pure idle+timer nudge engine.

import type { Slot } from "@nabd/domain";

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
export function tick({ state, currentSlot }: TickInput): NudgeState {
  const secondsToNext = Math.max(0, state.secondsToNext - 1);
  const idleSeconds = state.idleSeconds + 1;

  let notif = state.notif;

  if (!state.busy && notif === null && currentSlot !== null) {
    if (secondsToNext === 0) {
      notif = dueNotif("timer", currentSlot);
    } else if (idleSeconds >= state.idleNudge) {
      notif = dueNotif("idle", currentSlot);
    }
  }

  return {
    secondsToNext,
    idleSeconds,
    idleNudge: state.idleNudge,
    busy: state.busy,
    notif,
  };
}

/** Build the due-notification for a reason + slot. */
export function dueNotif(reason: NudgeReason, slot: Slot): Notif {
  return {
    slot,
    reason,
    label: reason === "idle" ? "You've gone quiet" : "Interval's up",
  };
}

/** Reset the idle counter to 0. */
export function resetIdle(state: NudgeState): NudgeState {
  return { ...state, idleSeconds: 0 };
}

/** Snooze: clear notif, set timer to snooze length, reset idle. */
export function snooze(state: NudgeState, snoozeSec: number): NudgeState {
  return { ...state, notif: null, secondsToNext: snoozeSec, idleSeconds: 0 };
}

/** Reset the timer to the full interval (after a set is logged). */
export function resetTimer(state: NudgeState, intervalMin: number): NudgeState {
  return { ...state, secondsToNext: intervalMin * 60, idleSeconds: 0, notif: null };
}
