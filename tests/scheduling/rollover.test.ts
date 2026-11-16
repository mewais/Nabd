import type { DayState, LoggedSet, Program } from "@nabd/domain";
import { dateKey } from "@nabd/domain";
import { rollOver } from "@nabd/scheduling";
import type { TodayPlanInput } from "@nabd/scheduling";
import { carry, logged, nov, visit } from "../support/builders";
import { EX } from "../support/exercises";
import { benchRow, cycledPlan, floatingPushPull, flyRow, raiseRow } from "../support/programs";
import { MONDAY, benchSet, dayState, input } from "./fixtures";

const TUESDAY = nov(17);

/** Rolling over from the day in `overrides.dayState` (Monday's, unless it says) to `overrides.date`. */
const roll = (overrides: Partial<TodayPlanInput>) => rollOver({ ...input(), ...overrides });

/** A cycled weekday plan: its first day on Sunday 15 Nov, its second on a Wednesday. */
const weekdayCycled: Program = {
  ...cycledPlan,
  schedule: "weekday",
  days: cycledPlan.days.map((day, index) => ({ ...day, weekday: index === 0 ? 0 : 3 })),
};

const chestSet = (hour: number, at = nov(16, hour)): LoggedSet =>
  logged(EX.bench, at, 10, 40, { planItemId: "chest" });

describe("rolling over to a new day", () => {
  it("a weekday plan's trained pools move on to their next exercise, the others stay", () => {
    const sunday = nov(15);
    const result = roll({
      program: weekdayCycled,
      dayState: dayState(sunday),
      history: [chestSet(10, nov(15))],
    });
    expect(result.rotation).toEqual({ chest: EX.fly.id });
    expect(result.dayState).toEqual(dayState(MONDAY));
    expect(result.records).toEqual([{ date: dateKey(sunday), planned: 6, done: 1 }]);
  });

  it("a pool moves on from the exercise it gave, wrapping round, wherever that now sits", () => {
    const trainedOn = (
      exercise: typeof EX.bench,
      rotation: Record<string, string>,
      pool: string[],
    ) =>
      roll({
        program: {
          ...weekdayCycled,
          days: weekdayCycled.days.map((day) => ({
            ...day,
            slots: day.slots.map((slot) => (slot.id === "chest" ? { ...slot, pool } : slot)),
          })),
        },
        dayState: dayState(nov(15)),
        rotation,
        history: [logged(exercise, nov(15), 10, 40, { planItemId: "chest" })],
      }).rotation;
    const pool = [EX.bench.id, EX.fly.id, EX.dip.id];
    expect(trainedOn(EX.dip, { chest: EX.dip.id }, pool)).toEqual({ chest: EX.bench.id });
    // An exercise was put in front of the pool during the day: Fly still follows Bench.
    expect(trainedOn(EX.bench, {}, [EX.dip.id, EX.bench.id, EX.fly.id])).toEqual({
      chest: EX.fly.id,
    });
    // The exercise trained has since left the pool: the pool stays where it points.
    expect(trainedOn(EX.bench, { chest: EX.fly.id }, [EX.fly.id, EX.dip.id])).toEqual({
      chest: EX.fly.id,
    });
  });

  it("a floating plan moves on once the day owes nothing, clearing skips, extras and pause", () => {
    const monday = dayState(MONDAY, {
      dayId: "a",
      skipped: ["delts"],
      extras: [{ id: "x", exId: EX.dip.id }],
      paused: true,
    });
    const done = [10, 11, 12].map((hour) => chestSet(hour));
    const args = { program: cycledPlan, dayState: monday, date: TUESDAY };
    expect(roll({ ...args, history: done }).dayState).toEqual(dayState(TUESDAY, { dayId: "b" }));
    expect(roll({ ...args, history: done.slice(1) }).dayState.dayId).toBe("a");
  });

  it("a floating plan wraps from its last day back to the first", () => {
    const onB = dayState(MONDAY, { dayId: "b" });
    expect(roll({ program: cycledPlan, dayState: onB, date: TUESDAY }).dayState.dayId).toBe("a");
  });

  it("a floating day with nothing plannable does not hold the plan up", () => {
    const args = { program: cycledPlan, date: TUESDAY };
    // Day B is empty.
    expect(roll({ ...args, dayState: dayState(MONDAY, { dayId: "b" }) }).dayState.dayId).toBe("a");
    // Every exercise of day A was skipped.
    const skippedAll = dayState(MONDAY, { dayId: "a", skipped: ["chest", "delts"] });
    expect(roll({ ...args, dayState: skippedAll }).dayState.dayId).toBe("b");
    // Every pool of day A is empty.
    const noPools: Program = {
      ...cycledPlan,
      days: cycledPlan.days.map((d) => ({ ...d, slots: d.slots.map((s) => ({ ...s, pool: [] })) })),
    };
    const onA = dayState(MONDAY, { dayId: "a" });
    expect(roll({ ...args, program: noPools, dayState: onA }).dayState.dayId).toBe("b");
  });

  it("records nothing for a day with no plan and no sets", () => {
    const result = roll({ dayState: dayState(TUESDAY), date: nov(18) });
    expect(result.records).toEqual([]);
    expect(result.rotation).toEqual({});
  });

  it("rollover records every planned weekday the app was not running for", () => {
    // Last opened on Monday 16th; next opened on Thursday 26th.
    const result = roll({ history: [benchSet(10)], date: nov(26) });
    expect(result.records).toEqual([
      { date: dateKey(nov(16)), planned: 10, done: 1 },
      { date: dateKey(nov(18)), planned: 3, done: 0 },
      { date: dateKey(nov(23)), planned: 10, done: 0 },
      { date: dateKey(nov(25)), planned: 3, done: 0 },
    ]);
  });

  it("a floating plan has no missed days: it waits for the user", () => {
    const result = roll({ program: floatingPushPull, history: [benchSet(10)], date: nov(26) });
    expect(result.records).toEqual([{ date: dateKey(nov(16)), planned: 10, done: 1 }]);
  });

  describe("what a floating plan puts on record", () => {
    const from = (state: DayState, history: LoggedSet[] = []) =>
      roll({ program: floatingPushPull, dayState: state, history, date: TUESDAY }).records;

    it("nothing for a day it sat idle: that day comes back, it was not missed", () => {
      expect(from(dayState(MONDAY))).toEqual([]);
    });

    it("a day that had sets, finished or not", () => {
      expect(from(dayState(MONDAY), [benchSet(10)])).toEqual([
        { date: dateKey(MONDAY), planned: 10, done: 1 },
      ]);
    });

    it("a day it moved on from without a set: skipped outright", () => {
      const skippedAll = dayState(MONDAY, { skipped: [benchRow.id, flyRow.id, raiseRow.id] });
      expect(from(skippedAll)).toEqual([{ date: dateKey(MONDAY), planned: 10, done: 0 }]);
    });
  });
});

describe("pools on a floating plan that is not finished", () => {
  const monday = dayState(MONDAY, { dayId: "a" });
  const partial = [10, 11].map((hour) => chestSet(hour));

  it("stay on the exercise they gave until the day is done", () => {
    const next = roll({ program: cycledPlan, dayState: monday, history: partial, date: TUESDAY });
    expect(next.rotation).toEqual({});
    expect(next.dayState.carried).toEqual(
      visit(MONDAY, { chest: carry(EX.bench.id, { working: 2 }) }),
    );
  });

  it("move on together, those trained on earlier days included, when the day completes", () => {
    const carried = visit(MONDAY, { chest: carry(EX.bench.id, { working: 3 }) });
    const earlier = dayState(TUESDAY, { dayId: "a", carried });
    const delts = [10, 11, 12].map((hour) =>
      logged(EX.raise, nov(17, hour), 10, 10, { planItemId: "delts" }),
    );
    const result = roll({
      program: cycledPlan,
      dayState: earlier,
      history: [...partial, ...delts],
      date: nov(18),
    });
    expect(result.rotation).toEqual({ chest: EX.fly.id, delts: EX.raise.id });
    expect(result.dayState).toEqual(dayState(nov(18), { dayId: "b" }));
  });
});
