import type { DayRecord } from "@nabd/domain";
import { dateKey } from "@nabd/domain";
import { rollOver } from "@nabd/scheduling";
import type { StoreContext } from "./context";
import { selectLibrary } from "./selectors";

/** Completed days kept for the completion charts. */
const DAY_LOG_LIMIT = 400;

/** The log with `records` added, each replacing an earlier record of its date. */
function withRecords(dayLog: readonly DayRecord[], records: readonly DayRecord[]): DayRecord[] {
  const closed = new Set(records.map((record) => record.date));
  return [...dayLog.filter((record) => !closed.has(record.date)), ...records].slice(-DAY_LOG_LIMIT);
}

/**
 * Close out a finished day and open today, if the calendar day has moved on;
 * returns whether it had. Every action that reads or writes "today" starts
 * here, so none of them can act on a day that is already over.
 *
 * Days only ever move forward. A clock that jumps back (a corrected clock, a
 * flight west over midnight) changes nothing: rolling over to an earlier day
 * would file the day we are on as a finished day in the future. The day that
 * is open stays open, and what is logged meanwhile counts toward it.
 */
export function beginDay({ get, set, now, persistTogether }: StoreContext): boolean {
  const s = get();
  const today = now();
  if (dateKey(today) <= s.dayState.date) return false;
  const { dayState, rotation, records } = rollOver({
    program: s.program,
    dayState: s.dayState,
    rotation: s.rotationState,
    history: s.history,
    date: today,
    lookup: selectLibrary(s).lookup,
    workDays: s.settings.workDays,
  });
  const dayLog = withRecords(s.dayLog, records);
  set({
    dayState,
    rotationState: rotation,
    dayLog,
    session: null,
    snoozedUntil: null,
    // Counting starts over with the new day (see settle.ts).
    activeSince: null,
    pendingNudge: null,
  });
  // One transaction: a rollover that is only partly on disk would be redone
  // at the next launch from a mix of old and new state (pools advanced twice).
  persistTogether("the new day", { dayLog, dayState, rotationState: rotation });
  return true;
}
