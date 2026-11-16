import { kgFromDisplay, loadStepKg, toggled } from "@nabd/domain";
import { NudgePolicy } from "@nabd/nudge";
import { LogSession } from "@nabd/session";
import type { StoreContext } from "./context";
import {
  addExtra,
  editSession,
  sessionAfter,
  sessionForLogging,
  sessionItem,
} from "./open-session";
import { beginDay } from "./rollover";
import { selectCoach, selectTodayPlan } from "./selectors";
import type { LoggingSlice } from "./slices";

type Actions<K extends keyof LoggingSlice> = Pick<LoggingSlice, K>;

/** Opening and closing the logger, and moving it between exercises. */
function openingActions(
  ctx: StoreContext,
): Actions<"openSession" | "openSessionOn" | "closeSession" | "focusItem"> {
  const { get, set, now } = ctx;
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

    openSessionOn: (exId) => {
      const existing = selectTodayPlan(get()).items.find((item) => item.exercise.id === exId);
      if (existing?.skipped) get().toggleSkip(existing.id);
      get().openSession((existing ?? addExtra(ctx, exId))?.id);
    },

    closeSession: () => set({ session: null }),

    focusItem: (itemId) => {
      const item = selectTodayPlan(get()).item(itemId);
      if (item) editSession(ctx, (s) => s.focus(item, selectCoach(get()).startFor(item)));
    },
  };
}

/** The numbers of the set being entered: stepped, typed, or taken from the advice. */
function formActions(
  ctx: StoreContext,
): Actions<"stepReps" | "stepWeight" | "setReps" | "setWeight" | "applyAdvice"> {
  const { get } = ctx;
  const stepKg = (): number => loadStepKg(get().settings);
  return {
    stepReps: (direction) => editSession(ctx, (s) => s.stepReps(direction)),

    stepWeight: (direction) => editSession(ctx, (s) => s.stepWeight(direction, stepKg())),

    setReps: (reps) => editSession(ctx, (s) => s.withReps(reps)),

    setWeight: (displayValue) => {
      const kg = kgFromDisplay(displayValue, get().settings.weightUnit);
      editSession(ctx, (s) => s.withWeight(kg, stepKg()));
    },

    applyAdvice: (which) => {
      const item = sessionItem(ctx);
      const target = item && selectCoach(get()).adviceFor(item)?.[which];
      if (target) {
        editSession(ctx, (s) => s.withReps(target.reps).withWeight(target.weight ?? 0, stepKg()));
      }
    },
  };
}

/** What today records: a set logged or undone, an exercise skipped or restored. */
function recordActions(ctx: StoreContext): Actions<"logSet" | "undoSet" | "toggleSkip"> {
  const { get, set, client, now, newId, attempt, save, saveSet } = ctx;
  return {
    logSet: async () => {
      const entry = sessionForLogging(ctx);
      if (!entry) return;
      const { session, item } = entry;
      // The set counts toward the day that is open, whatever the clock says (see beginDay),
      // and belongs to its session.
      const logged = session.toLoggedSet(item, newId(), now(), selectTodayPlan(get()));
      // Show the set first; saving must never be able to stall the logger.
      set((s) => ({ history: [...s.history, logged], snoozedUntil: null, pendingNudge: null }));
      set({ session: sessionAfter(ctx, session, item, logged) });
      await saveSet(logged);
    },

    undoSet: async (setId) => {
      const forget = (): void => set((s) => ({ history: s.history.filter((h) => h.id !== setId) }));
      // A set the backend never got has nothing to delete there.
      if (get().unsavedSets.includes(setId)) forget();
      // Otherwise the backend goes first: a set that could not be deleted stays on screen.
      else if ((await attempt("undo that set", () => client.deleteSet(setId))).ok) forget();
    },

    toggleSkip: (itemId) => {
      const { dayState } = get();
      const item = selectTodayPlan(get()).item(itemId);
      if (!item) return;
      if (item.isExtra && item.done === 0) {
        save("dayState", { ...dayState, extras: dayState.extras.filter((e) => e.id !== itemId) });
        return;
      }
      save("dayState", { ...dayState, skipped: toggled(dayState.skipped, itemId) });
    },
  };
}

export function loggingSlice(ctx: StoreContext): LoggingSlice {
  return { ...openingActions(ctx), ...formActions(ctx), ...recordActions(ctx) };
}
