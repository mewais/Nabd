// A small plan to schedule: a weekday Push / Pull program (and its floating
// twin), a cycled program, and builders for today's plan on Monday 16 Nov 2026.

import type { DayState, LoggedSet, Program } from "@nabd/domain";
import { freshDayState } from "@nabd/domain";
import { TodayPlan } from "@nabd/scheduling";
import type { TodayPlanInput } from "@nabd/scheduling";
import {
  exercise,
  logged,
  lookupIn,
  nov,
  prescription,
  row,
  threeSets,
  warmup,
} from "../support/domain-factories";

export const bench = exercise({ name: "Bench" });
export const fly = exercise({ name: "Fly" });
export const raise = exercise({ name: "Raise", group: "Shoulders", primary: ["side_delts"] });
export const dip = exercise({ name: "Dip" });
export const lookup = lookupIn([bench, fly, raise, dip]);

export const MONDAY = nov(16);
export const benchRow = row(bench.id, [warmup(12), ...threeSets()]);
export const flyRow = row(fly.id, threeSets(), { supersetId: "ss" });
export const raiseRow = row(raise.id, threeSets(), { supersetId: "ss" });

/** Push on Monday (bench, then fly and raise as a superset), Pull on Wednesday (dips). */
export const fixedProgram: Program = {
  name: "P",
  type: "fixed",
  schedule: "weekday",
  days: [
    { id: "mon", name: "Push", weekday: 1, exercises: [benchRow, flyRow, raiseRow], slots: [] },
    { id: "wed", name: "Pull", weekday: 3, exercises: [row(dip.id, threeSets())], slots: [] },
  ],
};

export const floating: Program = { ...fixedProgram, schedule: "floating" };

/** What a cycled slot prescribes in these tests. */
export const slotSets = () => prescription(threeSets(), { rest: 60 });

/** A floating cycled plan: day A has a two-exercise pool, a one-exercise pool and an empty one; day B is empty. */
export const cycled: Program = {
  name: "C",
  type: "cycled",
  schedule: "floating",
  days: [
    {
      id: "a",
      name: "A",
      weekday: null,
      // Left over from a fixed plan: must be ignored while the plan is cycled.
      exercises: [benchRow],
      slots: [
        { id: "chest", muscle: "chest", pool: [bench.id, fly.id], ...slotSets() },
        { id: "delts", muscle: "side_delts", pool: [raise.id], ...slotSets() },
        { id: "empty", muscle: "lats", pool: [], ...slotSets() },
      ],
    },
    { id: "b", name: "B", weekday: null, exercises: [], slots: [] },
  ],
};

export const dayState = (date: Date, overrides: Partial<DayState> = {}): DayState => ({
  ...freshDayState(date),
  ...overrides,
});

/** Monday on the weekday program, with nothing logged: the starting point most tests vary. */
export const input = (): TodayPlanInput => ({
  program: fixedProgram,
  date: MONDAY,
  dayState: dayState(MONDAY),
  rotation: {},
  history: [],
  lookup,
});

/** Monday's plan for the given history, day state, program and rotation. */
export function build(
  history: LoggedSet[] = [],
  state: DayState = dayState(MONDAY),
  program: Program = fixedProgram,
  rotation = {},
): TodayPlan {
  return TodayPlan.build({ ...input(), program, dayState: state, rotation, history });
}

/** A bench set logged against Monday's bench row at `hour`. */
export const benchSet = (hour: number, overrides: Partial<LoggedSet> = {}): LoggedSet =>
  logged(bench, nov(16, hour), 10, 40, { planItemId: benchRow.id, ...overrides });
