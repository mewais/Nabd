import type { DayRecord } from "@nabd/domain";
import { dateKey } from "@nabd/domain";
import { rollOver } from "@nabd/scheduling";
import type { DayActions } from "./actions";
import type { StoreContext } from "./context";
import { applyAutostart, applyGlass } from "./desktop";
import { loadNotice, readSnapshot } from "./hydration";
import { watchNudge } from "./nudge";
import { errorText } from "./persistence";
import { selectLibrary } from "./selectors";
import type { LoadProblem } from "./state";

/** Completed days kept for the completion charts. */
const DAY_LOG_LIMIT = 400;

/** The log with `records` added, each replacing an earlier record of its date. */
function withRecords(dayLog: readonly DayRecord[], records: readonly DayRecord[]): DayRecord[] {
  const closed = new Set(records.map((record) => record.date));
  return [...dayLog.filter((record) => !closed.has(record.date)), ...records].slice(-DAY_LOG_LIMIT);
}

/**
 * Close out a finished day and open today, if the calendar day has changed;
 * returns whether it had. Every action that reads or writes "today" starts
 * here, so none of them can act on a day that is already over.
 */
export function beginDay({ get, set, now, persistTogether }: StoreContext): boolean {
  const s = get();
  const today = now();
  if (s.dayState.date === dateKey(today)) return false;
  const { dayState, rotation, records } = rollOver({
    program: s.program,
    dayState: s.dayState,
    rotation: s.rotationState,
    history: s.history,
    date: today,
    lookup: selectLibrary(s).lookup,
  });
  const dayLog = withRecords(s.dayLog, records);
  set({
    dayState,
    rotationState: rotation,
    dayLog,
    session: null,
    paused: dayState.paused,
    snoozedUntil: null,
    activeSince: null,
    pendingNudge: null,
  });
  // One transaction: a rollover that is only partly on disk would be redone
  // at the next launch from a mix of old and new state (pools advanced twice).
  persistTogether("the new day", { dayLog, dayState, rotationState: rotation });
  return true;
}

export function dayActions(ctx: StoreContext): DayActions {
  const { get, set, client, now, attempt, persist } = ctx;

  /** Bring the OS in line with the stored settings, and learn what it can do. */
  function syncDesktop(): void {
    const { settings } = get();
    applyAutostart(ctx, settings.openAtStartup);
    applyGlass(ctx, settings.glass);
    void attempt("ask what this computer supports", async () =>
      set({ capabilities: await client.platformCapabilities() }),
    );
  }

  return {
    hydrate: async () => {
      let snapshot;
      try {
        snapshot = await client.loadAll();
      } catch (e) {
        const loadProblems: LoadProblem[] = [{ source: "everything", detail: errorText(e) }];
        set({ loadProblems, appNotice: loadNotice(loadProblems), booted: true });
        return;
      }
      const { state, problems } = readSnapshot(snapshot, now());
      set({
        ...state,
        paused: state.dayState.paused,
        loadProblems: problems,
        appNotice: loadNotice(problems),
        now: now(),
        booted: true,
      });
      // Make sure the day we are on is on record, so the next launch can roll it over.
      if (!beginDay(ctx)) persist("dayState", get().dayState);
      watchNudge(ctx);
      syncDesktop();
    },

    tick: (idleSeconds) => {
      set({ now: now(), idleSeconds });
      beginDay(ctx);
      watchNudge(ctx);
    },
  };
}
