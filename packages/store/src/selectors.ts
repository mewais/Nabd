// Derived data. Everything here is computed from state, never stored, so it
// cannot go stale; each selector is memoized on the state it reads.

import type { Coverage, DayRecord } from "@nabd/domain";
import { addDays, firstDay, loadStepKg, parseDateKey } from "@nabd/domain";
import { ExerciseLibrary } from "@nabd/dataset";
import { TodayPlan } from "@nabd/scheduling";
import { ExerciseProgress, ProgressionAdvisor } from "@nabd/progression";
import { Coach } from "@nabd/session";
import { NudgePolicy } from "@nabd/nudge";
import type { NudgeStatus, PendingNudge } from "@nabd/nudge";
import { MuscleVolume } from "@nabd/coverage";
import { TrainingStats } from "@nabd/analytics";
import type { NabdState } from "./state";

/** Cache a selector's result for as long as the inputs it reads stay identical. */
function memoize<Inputs extends unknown[], Result>(
  inputs: (s: NabdState) => Inputs,
  compute: (...inputs: Inputs) => Result,
): (s: NabdState) => Result {
  let last: { inputs: Inputs; result: Result } | null = null;
  return (s) => {
    const next = inputs(s);
    const fresh = last !== null && next.every((value, i) => value === last?.inputs[i]);
    if (last === null || !fresh) last = { inputs: next, result: compute(...next) };
    return last.result;
  };
}

/** The catalog plus the user's custom exercises. */
export const selectLibrary = memoize(
  (s) => [s.customExercises] as const,
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
      s.dayState.paused,
      selectTodayPlan(s).hasWork,
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

/**
 * The day the planner opens on: today's, or on a rest day the plan's first
 * (Monday-first for a weekday plan); null in an empty plan.
 */
export const selectPlannerDayToOpen = (s: NabdState): string | null =>
  selectTodayPlan(s).dayId ?? firstDay(s.program)?.id ?? null;

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

/** How every exercise with history has trended. */
export const selectExerciseProgress = memoize(
  (s) => [s.history, selectLibrary(s)] as const,
  (history, library) => new ExerciseProgress(history, library.lookup),
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
