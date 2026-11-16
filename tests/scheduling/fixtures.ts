// Today's plan on Monday 16 Nov 2026, built from the standard Push / Pull plan
// (tests/support/programs.ts) and whatever a test varies.

import type { DayState, LoggedSet, Program, Weekday } from "@nabd/domain";
import { DEFAULT_SETTINGS, freshDayState, parseDateKey } from "@nabd/domain";
import { TodayPlan } from "@nabd/scheduling";
import type { TodayPlanInput } from "@nabd/scheduling";
import { logged, nov } from "../support/builders";
import { EX, LIBRARY } from "../support/exercises";
import { benchRow, pushPull } from "../support/programs";

export const MONDAY = nov(16);

export const dayState = (date: Date, overrides: Partial<DayState> = {}): DayState => ({
  ...freshDayState(date),
  ...overrides,
});

/** Monday on the weekday program, with nothing logged: the starting point most tests vary. */
export const input = (): TodayPlanInput => ({
  program: pushPull,
  date: MONDAY,
  dayState: dayState(MONDAY),
  rotation: {},
  history: [],
  lookup: LIBRARY.lookup,
  workDays: DEFAULT_SETTINGS.workDays,
});

/** The weekday Push / Pull plan with its Push day moved to `weekday` (0 = Sunday … 6 = Saturday). */
export const pushPullOn = (weekday: Weekday): Program => ({
  ...pushPull,
  days: [{ ...pushPull.days[0]!, weekday }],
});

/** The plan of the day `state` is on (Monday, unless it says), for the given history, program and rotation. */
export function build(
  history: LoggedSet[] = [],
  state: DayState = dayState(MONDAY),
  program: Program = pushPull,
  rotation = {},
): TodayPlan {
  const date = parseDateKey(state.date);
  return TodayPlan.build({ ...input(), program, date, dayState: state, rotation, history });
}

/** A bench set logged against Monday's bench row at `hour`. */
export const benchSet = (hour: number, overrides: Partial<LoggedSet> = {}): LoggedSet =>
  logged(EX.bench, nov(16, hour), 10, 40, { planItemId: benchRow.id, ...overrides });
