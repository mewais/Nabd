// Derived data. Everything here is computed from state, never stored, so it
// cannot go stale; each selector is memoized on the state it reads.

import type { Coverage, DayRecord, Exercise } from "@nabd/domain";
import { addDays, loadStepKg, parseDateKey } from "@nabd/domain";
import { ExerciseLibrary } from "@nabd/dataset";
import { TodayPlan } from "@nabd/scheduling";
import { ExerciseProgress, ProgressionAdvisor } from "@nabd/progression";
import { Coach } from "@nabd/session";
import { NudgePolicy, type NudgeStatus, type PendingNudge } from "@nabd/nudge";
import { MuscleVolume } from "@nabd/coverage";
import { TrainingStats } from "@nabd/analytics";
import type { NabdState } from "./state";

/** Cache a selector's result for as long as the inputs it reads stay identical. */
function memoize<Inputs extends unknown[], Result>(
  inputs: (s: NabdState) => Inputs,
  compute: (...inputs: Inputs) => Result,
): (s: NabdState) => Result {
  let lastInputs: Inputs | null = null;
  let lastResult: Result;
  return (s) => {
    const next = inputs(s);
    if (lastInputs === null || next.some((value, i) => value !== lastInputs![i])) {
      lastResult = compute(...next);
      lastInputs = next;
    }
    return lastResult;
  };
}

/** The catalog plus the user's custom exercises. */
export const selectLibrary = memoize(
  (s) => [s.customExercises] as [Exercise[]],
  (custom) => ExerciseLibrary.catalog.withCustom(custom),
);

/** Today's queue. */
export const selectTodayPlan = memoize(
  (s) => [s.program, s.dayState, s.rotationState, s.history, selectLibrary(s)] as const,
  (program, dayState, rotation, history, library) =>
    TodayPlan.build({
      program,
      dayState,
      rotation,
      history,
      date: parseDateKey(dayState.date),
      lookup: library.lookup,
    }),
);

/** Progression advice + form defaults for today's exercises. */
export const selectCoach = memoize(
  (s) => [s.history, loadStepKg(s.settings), s.dayState.date] as const,
  (history, stepKg, today) => new Coach(history, new ProgressionAdvisor(stepKg), today),
);

/** When the last set of today was logged. */
const selectLastSetAt = memoize(
  (s) => [s.history, s.dayState.date] as const,
  (history, today) => {
    const last = history.at(-1);
    return last?.date === today ? new Date(last.ts) : null;
  },
);

/** What the nudge rules say at this very moment (the store latches it; see selectNudgeStatus). */
export const selectPolicyStatus = memoize(
  (s) =>
    [
      s.settings,
      s.now,
      selectLastSetAt(s),
      s.activeSince,
      s.snoozedUntil,
      s.idleSeconds,
      s.paused,
      selectTodayPlan(s).setsRemaining > 0,
    ] as const,
  (settings, now, lastSetAt, activeSince, snoozedUntil, idleSeconds, paused, hasWork) =>
    new NudgePolicy(settings).evaluate({
      now,
      lastSetAt,
      activeSince,
      snoozedUntil,
      idleSeconds,
      paused,
      hasWork,
    }),
);

/**
 * Whether a set is due, and if not, when it will be. A nudge that has fired
 * stays due until it is answered, whatever the rules say a second later.
 */
export const selectNudgeStatus = memoize(
  (s) => [s.pendingNudge, selectPolicyStatus(s)] as const,
  (pending, status): NudgeStatus =>
    pending === null ? status : { state: "due", reason: pending.reason },
);

/**
 * The nudge waiting for an answer, or null. Its identity changes exactly once
 * per nudge, so "a nudge just fired" is "this became a new non-null object".
 */
export const selectPendingNudge = (s: NabdState): PendingNudge | null => s.pendingNudge;

/** What the plan trains over one pass through the program. */
export const selectPlannedVolume = memoize(
  (s) => [s.program, selectLibrary(s)] as const,
  (program, library) => MuscleVolume.ofProgram(program, library.lookup),
);

/** What was actually trained in the last 7 days, 0–100 per muscle. */
export const selectCoverage = memoize(
  (s) => [s.history, selectLibrary(s), s.dayState.date] as const,
  (history, library, today): Coverage => {
    const endOfToday = addDays(parseDateKey(today), 1);
    return MuscleVolume.ofRecentHistory(history, library.lookup, endOfToday).toCoverage();
  },
);

/** How every exercise with history has trended, in the user's weight unit. */
export const selectExerciseProgress = memoize(
  (s) => [s.history, selectLibrary(s), s.settings.weightUnit] as const,
  (history, library, unit) => new ExerciseProgress(history, library.lookup, unit),
);

/** Today's completion so far, in the same shape as the finished days in the log. */
const selectTodayRecord = memoize(
  (s) => [selectTodayPlan(s)] as const,
  (plan): DayRecord[] => {
    const record = plan.record();
    return record === null ? [] : [record];
  },
);

export const selectStats = memoize(
  (s) => [s.history, s.dayLog, selectTodayRecord(s), s.dayState.date] as const,
  (history, dayLog, today, date) =>
    new TrainingStats(history, [...dayLog, ...today], parseDateKey(date)),
);
