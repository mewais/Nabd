// What holds after every change of state. These are facts about the state as
// a whole, so they are restored by the store itself, inside the very change
// that would have broken them, rather than by each action that might.

import type { LogSession } from "@nabd/session";
import { selectCoach, selectTodayPlan } from "./selectors";
import type { NabdState } from "./state";

/**
 * A session always points at an exercise in today's queue, so the logger can
 * always be drawn. When its exercise leaves the queue — deleted from the plan
 * or the library, its last set undone, the plan replaced — the session moves
 * to the same exercise under its new plan item, else to the next exercise
 * that owes a set, and closes when there is neither.
 */
function settledSession(before: NabdState, after: NabdState): LogSession | null {
  const { session } = after;
  if (session === null) return null;
  const plan = selectTodayPlan(after);
  if (plan.item(session.itemId)) return session;
  const exId = selectTodayPlan(before).item(session.itemId)?.exercise.id;
  const next = plan.items.find((item) => item.exercise.id === exId) ?? plan.nextItem;
  return next ? session.focus(next, selectCoach(after).startFor(next)) : null;
}

/**
 * Nudging counts from the moment there first was work to do (see
 * NudgeContext.activeSince): set when the plan gains work, cleared when none is left.
 */
function settledActiveSince(after: NabdState): Date | null {
  return selectTodayPlan(after).hasWork ? (after.activeSince ?? after.now) : null;
}

/** The corrections that make `after`, reached from `before`, a settled state. */
export function settle(before: NabdState, after: NabdState): Partial<NabdState> {
  return {
    session: settledSession(before, after),
    activeSince: settledActiveSince(after),
  };
}
