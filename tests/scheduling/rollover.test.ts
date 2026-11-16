import type { DayState, LoggedSet, Program } from "@nabd/domain";
import { dateKey } from "@nabd/domain";
import { rollOver } from "@nabd/scheduling";
import { logged, nov } from "../support/builders";
import { EX, LIBRARY } from "../support/exercises";
import {
  benchRow,
  cycledPlan,
  floatingPushPull,
  flyRow,
  pushPull,
  raiseRow,
} from "../support/programs";
import { MONDAY, benchSet, dayState, input } from "./fixtures";

describe("rolling over to a new day", () => {
  it("rollover advances only the pools that were trained", () => {
    const sunday = dayState(nov(15));
    const history = [logged(EX.bench, nov(15), 10, 40, { planItemId: "chest" })];
    const result = rollOver({
      program: cycledPlan,
      dayState: sunday,
      rotation: {},
      history,
      lookup: LIBRARY.lookup,
      date: MONDAY,
    });
    expect(result.rotation).toEqual({ chest: EX.fly.id });
    expect(result.dayState).toEqual(dayState(MONDAY));
    expect(result.records).toEqual([{ date: dateKey(nov(15)), planned: 6, done: 1 }]);
  });

  it("a pool moves on from the exercise it gave, wrapping round, wherever that now sits", () => {
    const trainedOn = (
      exercise: typeof EX.bench,
      rotation: Record<string, string>,
      pool: string[],
    ) =>
      rollOver({
        program: {
          ...cycledPlan,
          days: cycledPlan.days.map((day) => ({
            ...day,
            slots: day.slots.map((slot) => (slot.id === "chest" ? { ...slot, pool } : slot)),
          })),
        },
        dayState: dayState(nov(15)),
        rotation,
        history: [logged(exercise, nov(15), 10, 40, { planItemId: "chest" })],
        lookup: LIBRARY.lookup,
        date: MONDAY,
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
    const sunday = dayState(nov(15), {
      dayId: "a",
      skipped: ["delts"],
      extras: [{ id: "x", exId: EX.dip.id }],
      paused: true,
    });
    const done = [10, 11, 12].map((h) =>
      logged(EX.bench, nov(15, h), 10, 40, { planItemId: "chest" }),
    );
    const args = {
      program: cycledPlan,
      dayState: sunday,
      rotation: {},
      lookup: LIBRARY.lookup,
      date: MONDAY,
    };
    expect(rollOver({ ...args, history: done }).dayState).toEqual(dayState(MONDAY, { dayId: "b" }));
    expect(rollOver({ ...args, history: done.slice(1) }).dayState.dayId).toBe("a");
  });

  it("a floating plan wraps from its last day back to the first", () => {
    const onB = dayState(nov(15), { dayId: "b" });
    const result = rollOver({
      program: cycledPlan,
      dayState: onB,
      rotation: {},
      history: [],
      lookup: LIBRARY.lookup,
      date: MONDAY,
    });
    expect(result.dayState.dayId).toBe("a");
  });

  it("a floating day with nothing plannable does not hold the plan up", () => {
    const args = {
      program: cycledPlan,
      rotation: {},
      history: [],
      lookup: LIBRARY.lookup,
      date: MONDAY,
    };
    // Day B is empty.
    expect(rollOver({ ...args, dayState: dayState(nov(15), { dayId: "b" }) }).dayState.dayId).toBe(
      "a",
    );
    // Every exercise of day A was skipped.
    const skippedAll = dayState(nov(15), { dayId: "a", skipped: ["chest", "delts"] });
    expect(rollOver({ ...args, dayState: skippedAll }).dayState.dayId).toBe("b");
    // Every pool of day A is empty.
    const noPools: Program = {
      ...cycledPlan,
      days: cycledPlan.days.map((d) => ({ ...d, slots: d.slots.map((s) => ({ ...s, pool: [] })) })),
    };
    const onA = dayState(nov(15), { dayId: "a" });
    expect(rollOver({ ...args, program: noPools, dayState: onA }).dayState.dayId).toBe("b");
  });

  it("an untouched floating day with work on it comes back the next day", () => {
    const onA = dayState(nov(15), { dayId: "a" });
    const result = rollOver({
      program: cycledPlan,
      dayState: onA,
      rotation: {},
      history: [],
      lookup: LIBRARY.lookup,
      date: MONDAY,
    });
    expect(result.dayState.dayId).toBe("a");
  });

  it("records nothing for a day with no plan and no sets", () => {
    const tuesday = dayState(nov(17));
    const result = rollOver({
      program: pushPull,
      dayState: tuesday,
      rotation: {},
      history: [],
      lookup: LIBRARY.lookup,
      date: nov(18),
    });
    expect(result.records).toEqual([]);
    expect(result.rotation).toEqual({});
  });

  it("rollover records every planned weekday the app was not running for", () => {
    // Last opened on Monday 16th; next opened on Thursday 26th.
    const history = [benchSet(10)];
    const result = rollOver({ ...input(), history, date: nov(26) });
    expect(result.records).toEqual([
      { date: dateKey(nov(16)), planned: 10, done: 1 },
      { date: dateKey(nov(18)), planned: 3, done: 0 },
      { date: dateKey(nov(23)), planned: 10, done: 0 },
      { date: dateKey(nov(25)), planned: 3, done: 0 },
    ]);
  });

  it("a floating plan has no missed days: it waits for the user", () => {
    const result = rollOver({
      ...input(),
      program: floatingPushPull,
      history: [benchSet(10)],
      date: nov(26),
    });
    expect(result.records).toEqual([{ date: dateKey(nov(16)), planned: 10, done: 1 }]);
  });

  describe("what a floating plan puts on record", () => {
    const from = (state: DayState, history: LoggedSet[] = []) =>
      rollOver({ ...input(), program: floatingPushPull, dayState: state, history, date: nov(17) })
        .records;

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
