// The logger's open session, as the store keeps it: read, changed, moved to
// today's plan, and moved on after a set.

import type { LoggedSet } from "@nabd/domain";
import type { PlanItem } from "@nabd/scheduling";
import { focusAfter } from "@nabd/scheduling";
import type { LogSession } from "@nabd/session";
import type { StoreContext } from "./context";
import { beginDay } from "./rollover";
import { selectCoach, selectTodayPlan } from "./selectors";

type Reader = Pick<StoreContext, "get">;

/** Add an exercise to today outside the plan; returns its item in today's queue. */
export function addExtra({ get, newId, save }: StoreContext, exId: string): PlanItem | undefined {
  const { dayState } = get();
  const extra = { id: newId(), exId };
  save("dayState", { ...dayState, extras: [...dayState.extras, extra] });
  return selectTodayPlan(get()).item(extra.id);
}

/** Apply a change to the open session, if there is one. */
export function editSession(
  { get, set }: Pick<StoreContext, "get" | "set">,
  change: (session: LogSession) => LogSession,
): void {
  const { session } = get();
  if (session) set({ session: change(session) });
}

/** The open session's exercise, if the session and the exercise both still exist. */
export function sessionItem({ get }: Reader): PlanItem | null {
  const { session } = get();
  return session ? (selectTodayPlan(get()).item(session.itemId) ?? null) : null;
}

/**
 * The open session and its exercise, on today's plan. If midnight passed with
 * the logger open, the day is rolled over first and the draft moves to today's
 * queue (as an extra when today does not plan that exercise), so a set is never
 * stamped with one day's date and another day's plan item.
 */
export function sessionForLogging(
  ctx: StoreContext,
): { session: LogSession; item: PlanItem } | null {
  const { get, set } = ctx;
  const { session } = get();
  const item = sessionItem(ctx);
  if (!session || !item) return null;
  if (!beginDay(ctx)) return { session, item };

  const plan = selectTodayPlan(get());
  const exId = item.exercise.id;
  const target =
    plan.item(item.id) ?? plan.items.find((i) => i.exercise.id === exId) ?? addExtra(ctx, exId);
  if (!target) return null;
  const moved = session.focus(target, session.performance);
  set({ session: moved });
  return { session: moved, item: target };
}

/**
 * After `logged`, a set of `item`: rest, then on to whatever the plan says
 * comes next. The form keeps its numbers only while the next set is more of
 * the same; another exercise, or another kind of set of this one (the warm-up
 * is over, a drop set follows), starts from its own numbers.
 */
export function sessionAfter(
  { get }: Reader,
  session: LogSession,
  item: PlanItem,
  logged: LoggedSet,
): LogSession {
  const rested = session.resting(new Date(logged.ts), item.prescription?.rest ?? 0);
  const next = focusAfter(selectTodayPlan(get()), item.id);
  if (next === null) return rested;
  const moreOfTheSame = next.id === item.id && (next.nextSet?.type ?? "working") === logged.setType;
  return moreOfTheSame ? rested : rested.focus(next, selectCoach(get()).startFor(next));
}
