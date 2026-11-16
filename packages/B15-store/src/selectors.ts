// Derived data. Everything here is computed from state, never stored, so it
// cannot go stale; each selector is memoized on the state it reads.

import type { Coverage, DayRecord, Exercise } from "@nabd/domain";
import { kgFromDisplay, parseDateKey } from "@nabd/domain";
import { ExerciseLibrary } from "@nabd/dataset";
import { TodayPlan } from "@nabd/scheduling";
import { ProgressionAdvisor } from "@nabd/progression";
import { Coach } from "@nabd/session";
import { NudgePolicy, type NudgeStatus } from "@nabd/nudge";
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
      lookup: (id) => library.byId(id),
    }),
);

/** Progression advice + form defaults for today's exercises. */
export const selectCoach = memoize(
  (s) => [s.history, s.settings.weightIncrement, s.settings.weightUnit, s.dayState.date] as const,
  (history, increment, unit, today) =>
    new Coach(history, new ProgressionAdvisor(kgFromDisplay(increment, unit)), today),
);

/** When the last set of today was logged. */
const selectLastSetAt = memoize(
  (s) => [s.history, s.dayState.date] as const,
  (history, today) => {
    const last = history.at(-1);
    return last?.date === today ? new Date(last.ts) : null;
  },
);

/** Whether a set is due, and if not, when it will be. */
export const selectNudgeStatus = memoize(
  (s) =>
    [
      s.settings,
      s.now,
      selectLastSetAt(s),
      s.snoozedUntil,
      s.idleSeconds,
      s.paused,
      selectTodayPlan(s).setsRemaining > 0,
    ] as const,
  (settings, now, lastSetAt, snoozedUntil, idleSeconds, paused, hasWork): NudgeStatus =>
    new NudgePolicy(settings).evaluate({
      now,
      lastSetAt,
      snoozedUntil,
      idleSeconds,
      paused,
      hasWork,
    }),
);

/** What the plan trains over one pass through the program. */
export const selectPlannedVolume = memoize(
  (s) => [s.program, selectLibrary(s)] as const,
  (program, library) => MuscleVolume.ofProgram(program, (id) => library.byId(id)),
);

/** What was actually trained in the last 7 days, 0–100 per muscle. */
export const selectCoverage = memoize(
  (s) => [s.history, selectLibrary(s), s.dayState.date] as const,
  (history, library, today): Coverage => {
    const endOfToday = new Date(parseDateKey(today).getTime() + 24 * 60 * 60 * 1000);
    return MuscleVolume.ofRecentHistory(history, (id) => library.byId(id), endOfToday).toCoverage();
  },
);

/** Today's completion so far, in the same shape as the finished days in the log. */
const selectTodayRecord = memoize(
  (s) => [selectTodayPlan(s)] as const,
  (plan): DayRecord[] => {
    const planned = plan.items.reduce((n, i) => n + i.planned, 0);
    return planned > 0 ? [{ date: plan.date, planned, done: plan.setsDone }] : [];
  },
);

export const selectStats = memoize(
  (s) => [s.history, s.dayLog, selectTodayRecord(s), s.dayState.date] as const,
  (history, dayLog, today, date) =>
    new TrainingStats(history, [...dayLog, ...today], parseDateKey(date)),
);
