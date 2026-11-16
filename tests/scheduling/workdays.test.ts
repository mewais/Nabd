// A day that is not a workday owes nothing until a set is logged on it.

import type { DayState, LoggedSet, Program } from "@nabd/domain";
import { dateKey } from "@nabd/domain";
import { TodayPlan, rollOver } from "@nabd/scheduling";
import { logged, nov } from "../support/builders";
import { EX } from "../support/exercises";
import { benchRow, cycledPlan, floatingPushPull, flyRow, raiseRow } from "../support/programs";
import { dayState, input, pushPullOn } from "./fixtures";

const FRIDAY = nov(20);
const SATURDAY = nov(21);
const SUNDAY = nov(22);

const benchOn = (date: Date) =>
  logged(EX.bench, date, 10, 40, { planItemId: benchRow.id, date: dateKey(date) });

/** Rolling over from `state` to `date`, on the floating Push / Pull plan unless told otherwise. */
const roll = (
  state: DayState,
  date: Date,
  program: Program = floatingPushPull,
  history: LoggedSet[] = [],
) => rollOver({ ...input(), program, dayState: state, history, date });

describe("a floating plan over a day off", () => {
  // Day B of the plan is empty, and so owes nothing.
  const onEmptyDay = (day: Date) => dayState(day, { dayId: "b" });

  it("moves on from an empty workday, never from an empty day off that nothing was logged on", () => {
    expect(roll(onEmptyDay(FRIDAY), SATURDAY, cycledPlan).dayState.dayId).toBe("a");
    expect(roll(onEmptyDay(SATURDAY), SUNDAY, cycledPlan).dayState.dayId).toBe("b");
  });

  it("hands on what an unfinished day has behind it, and puts nothing on record", () => {
    const friday = roll(dayState(FRIDAY), SATURDAY, floatingPushPull, [benchOn(nov(20, 10))]);
    expect(friday.records).toEqual([{ date: dateKey(FRIDAY), planned: 10, done: 1 }]);
    const saturday = roll(friday.dayState, SUNDAY);
    expect(saturday.dayState).toEqual(dayState(SUNDAY, { carried: { [benchRow.id]: 1 } }));
    expect(saturday.records).toEqual([]);
  });

  it("counts a day off, and moves on from it, once a set was logged on it", () => {
    const carried = { [benchRow.id]: 3, [flyRow.id]: 3, [raiseRow.id]: 3 };
    const state = dayState(SATURDAY, { carried });
    const finished = roll(state, SUNDAY, floatingPushPull, [benchOn(nov(21, 10))]);
    expect(finished.dayState).toEqual(dayState(SUNDAY, { dayId: "wed" }));
    expect(finished.records).toEqual([{ date: dateKey(SATURDAY), planned: 1, done: 1 }]);
  });
});

describe("a weekday plan over a day off", () => {
  const plan = (workDays: number[], logs = [benchOn(nov(21, 10))]) =>
    TodayPlan.build({
      ...input(),
      program: pushPullOn(6),
      date: SATURDAY,
      dayState: dayState(SATURDAY),
      history: logs,
      workDays,
    });

  it("has no record of a day off that nothing was logged on", () => {
    expect(plan([1, 2, 3, 4, 5], []).ledger.record()).toBeNull();
    expect(plan([1, 2, 3, 4, 5], []).ledger.record(true)).toBeNull();
  });

  it("has one as soon as a set is logged", () => {
    expect(plan([1, 2, 3, 4, 5]).ledger.record()).toEqual({
      date: dateKey(SATURDAY),
      planned: 10,
      done: 1,
    });
  });

  it("is owed in full on a day that is worked, whatever the weekday", () => {
    expect(plan([6], []).ledger.record()).toEqual({
      date: dateKey(SATURDAY),
      planned: 10,
      done: 0,
    });
  });
});
