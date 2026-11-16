import { kgFromDisplay, loadStepKg } from "@nabd/domain";
import { NudgePolicy } from "@nabd/nudge";
import type { PlanItem } from "@nabd/scheduling";
import { LogSession } from "@nabd/session";
import type { LoggingActions } from "./actions";
import type { StoreContext } from "./context";
import { beginDay } from "./day";
import { selectCoach, selectTodayPlan } from "./selectors";

/** Add an exercise to today outside the plan; returns its item in today's queue. */
export function addExtra({ get, newId, save }: StoreContext, exId: string): PlanItem | undefined {
  const { dayState } = get();
  const extra = { id: newId(), exId };
  save("dayState", { ...dayState, extras: [...dayState.extras, extra] });
  return selectTodayPlan(get()).item(extra.id);
}

export function loggingActions(ctx: StoreContext): LoggingActions {
  const { get, set, client, now, newId, attempt, save } = ctx;

  /** Apply a change to the open session, if there is one. */
  function editSession(change: (session: LogSession) => LogSession): void {
    const { session } = get();
    if (session) set({ session: change(session) });
  }

  /** The open session's exercise, if the session and the exercise both still exist. */
  function sessionItem(): PlanItem | null {
    const { session } = get();
    return session ? (selectTodayPlan(get()).item(session.itemId) ?? null) : null;
  }

  /**
   * The open session and its exercise, on today's plan. If midnight passed
   * with the logger open, the day is rolled over first and the draft moves to
   * today's queue (as an extra when today does not plan that exercise), so a
   * set is never stamped with one day's date and another day's plan item.
   */
  function sessionForLogging(): { session: LogSession; item: PlanItem } | null {
    const { session } = get();
    const item = sessionItem();
    if (!session || !item) return null;
    if (!beginDay(ctx)) return { session, item };

    const plan = selectTodayPlan(get());
    const exId = item.exercise.id;
    const target =
      plan.item(item.id) ?? plan.items.find((i) => i.exercise.id === exId) ?? addExtra(ctx, exId);
    if (!target) return null;
    const moved = session.focus(target, { reps: session.reps, weight: session.weight });
    set({ session: moved });
    return { session: moved, item: target };
  }

  /** After a set of `item`: rest, then on to whatever the plan says comes next. */
  function sessionAfter(session: LogSession, item: PlanItem, at: Date): LogSession {
    const rested = session.resting(at, item.prescription?.rest ?? 0);
    const next = selectTodayPlan(get()).focusAfter(item.id);
    return next && next.id !== item.id
      ? rested.focus(next, selectCoach(get()).startFor(next))
      : rested;
  }

  return {
    openSession: (itemId) => {
      beginDay(ctx);
      const s = get();
      const plan = selectTodayPlan(s);
      const item = (itemId === undefined ? plan.nextItem : plan.item(itemId)) ?? plan.items[0];
      if (!item) return;
      const nudge = s.pendingNudge;
      set({
        session: LogSession.open(item, selectCoach(s).startFor(item), nudge?.reason ?? "manual"),
        pendingNudge: null,
        // An answered nudge goes quiet like a snoozed one, so closing the logger
        // without logging does not bring it straight back.
        snoozedUntil: nudge ? NudgePolicy.snoozeUntil(now()) : s.snoozedUntil,
      });
    },

    closeSession: () => set({ session: null }),

    focusItem: (itemId) => {
      const item = selectTodayPlan(get()).item(itemId);
      if (item) editSession((s) => s.focus(item, selectCoach(get()).startFor(item)));
    },

    stepReps: (direction) => {
      const item = sessionItem();
      if (item) editSession((s) => s.stepReps(item, direction));
    },

    stepWeight: (direction) =>
      editSession((s) => s.stepWeight(direction, loadStepKg(get().settings))),

    setReps: (reps) => editSession((s) => s.withReps(reps)),

    setWeight: (displayValue) =>
      editSession((s) => s.withWeight(kgFromDisplay(displayValue, get().settings.weightUnit))),

    applyAdvice: (which) => {
      const item = sessionItem();
      const target = item && selectCoach(get()).adviceFor(item)?.[which];
      if (target) editSession((s) => s.withReps(target.reps).withWeight(target.weight ?? 0));
    },

    logSet: async () => {
      const entry = sessionForLogging();
      if (!entry) return;
      const { session, item } = entry;
      const at = now();
      const logged = session.toLoggedSet(item, newId(), at);
      // Show the set first; saving must never be able to stall the logger.
      set((s) => ({ history: [...s.history, logged], snoozedUntil: null, pendingNudge: null }));
      set({ session: sessionAfter(session, item, at) });
      await attempt("save that set", () => client.appendSet(logged));
    },

    // The backend goes first: a set that could not be deleted stays on screen.
    undoSet: async (setId) => {
      if (await attempt("undo that set", () => client.deleteSet(setId))) {
        set((s) => ({ history: s.history.filter((h) => h.id !== setId) }));
      }
    },

    toggleSkip: (itemId) => {
      const { dayState } = get();
      const item = selectTodayPlan(get()).item(itemId);
      if (!item) return;
      if (item.isExtra && item.done === 0) {
        save("dayState", { ...dayState, extras: dayState.extras.filter((e) => e.id !== itemId) });
        return;
      }
      const skipped = item.skipped
        ? dayState.skipped.filter((id) => id !== itemId)
        : [...dayState.skipped, itemId];
      save("dayState", { ...dayState, skipped });
    },
  };
}
