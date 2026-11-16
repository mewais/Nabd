// Today's plan on Monday 16 Nov 2026, built from the standard Push / Pull plan
// (tests/support/programs.ts) and whatever a test varies.

import type { DayState, LoggedSet, Program } from "@nabd/domain";
import { freshDayState } from "@nabd/domain";
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
});

/** Monday's plan for the given history, day state, program and rotation. */
export function build(
  history: LoggedSet[] = [],
  state: DayState = dayState(MONDAY),
  program: Program = pushPull,
  rotation = {},
): TodayPlan {
  return TodayPlan.build({ ...input(), program, dayState: state, rotation, history });
}

/** A bench set logged against Monday's bench row at `hour`. */
export const benchSet = (hour: number, overrides: Partial<LoggedSet> = {}): LoggedSet =>
  logged(EX.bench, nov(16, hour), 10, 40, { planItemId: benchRow.id, ...overrides });
