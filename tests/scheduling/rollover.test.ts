import type { DayState, LoggedSet, Program } from "@nabd/domain";
import { dateKey } from "@nabd/domain";
import {
  dayIdAfterEdit,
  rollOver,
  rotationAfterEdit,
  selectedDayAfterEdit,
} from "@nabd/scheduling";
import { logged, nov } from "../support/domain-factories";
import {
  MONDAY,
  bench,
  benchRow,
  benchSet,
  cycled,
  dayState,
  dip,
  fixedProgram,
  floating,
  fly,
  flyRow,
  input,
  lookup,
  raiseRow,
} from "./fixtures";

describe("a floating plan across plan edits", () => {
  it("stays on its day when the days around it are edited", () => {
    const [mon, wed] = floating.days as [Program["days"][0], Program["days"][0]];
    const reordered: Program = { ...floating, days: [{ ...wed, id: "new" }, wed, mon] };
    expect(dayIdAfterEdit(floating, reordered, null, MONDAY)).toBe("mon");
    expect(dayIdAfterEdit(floating, reordered, "wed", MONDAY)).toBe("wed");
  });

  it("removing the current floating day lands on the day that took its place", () => {
    const only = (index: number): Program => ({ ...floating, days: [floating.days[index]!] });
    expect(dayIdAfterEdit(floating, only(1), "mon", MONDAY)).toBe("wed");
    expect(dayIdAfterEdit(floating, only(0), "wed", MONDAY)).toBe("mon");
    expect(dayIdAfterEdit(floating, { ...floating, days: [] }, "wed", MONDAY)).toBeNull();
  });
});

describe("today's day across a switch of schedule", () => {
  it("a weekday plan going floating starts on today's day, not on a position left from before", () => {
    // Wednesday is Pull day; "mon" is where an earlier floating spell had stopped.
    expect(dayIdAfterEdit(fixedProgram, floating, "mon", nov(18))).toBe("wed");
    expect(dayIdAfterEdit(fixedProgram, floating, null, MONDAY)).toBe("mon");
  });

  it("on a rest day it starts from the first day", () => {
    expect(dayIdAfterEdit(fixedProgram, floating, "wed", nov(17))).toBeNull();
  });

  it("a weekday plan remembers no floating day", () => {
    expect(dayIdAfterEdit(floating, fixedProgram, "wed", MONDAY)).toBeNull();
    expect(dayIdAfterEdit(fixedProgram, { ...fixedProgram, days: [] }, "wed", MONDAY)).toBeNull();
  });
});

describe("the day open in the planner across plan edits", () => {
  const [mon, wed] = floating.days as [Program["days"][0], Program["days"][0]];
  const added: Program["days"][0] = { ...wed, id: "new" };

  it("a day the edit added is opened", () => {
    expect(selectedDayAfterEdit(floating, { ...floating, days: [mon, wed, added] }, "mon")).toBe(
      "new",
    );
  });

  it("the open day stays open when it moves", () => {
    expect(selectedDayAfterEdit(floating, { ...floating, days: [wed, mon] }, "mon")).toBe("mon");
  });

  it("deleting the open day opens its neighbour", () => {
    const three: Program = { ...floating, days: [mon, wed, added] };
    expect(selectedDayAfterEdit(three, { ...three, days: [mon, added] }, "wed")).toBe("new");
    expect(selectedDayAfterEdit(three, { ...three, days: [mon, wed] }, "new")).toBe("wed");
    expect(selectedDayAfterEdit(floating, { ...floating, days: [] }, "mon")).toBeNull();
  });

  it("with no day open, none is opened by an edit that adds none", () => {
    expect(selectedDayAfterEdit(floating, { ...floating, name: "Renamed" }, null)).toBeNull();
  });
});

describe("the rotation across plan edits", () => {
  const withPool = (pool: string[]): Program => ({
    ...cycled,
    days: cycled.days.map((day) => ({
      ...day,
      slots: day.slots.map((slot) => (slot.id === "chest" ? { ...slot, pool } : slot)),
    })),
  });
  const three = withPool([bench.id, fly.id, dip.id]);

  it("is the same rotation when no pool lost the exercise it was about to give", () => {
    const rotation = { chest: fly.id };
    expect(rotationAfterEdit(three, withPool([fly.id, dip.id]), rotation)).toBe(rotation);
    expect(rotationAfterEdit(three, withPool([dip.id, fly.id, bench.id]), rotation)).toBe(rotation);
  });

  it("a pool that lost the exercise it was about to give moves on to the one after it", () => {
    expect(rotationAfterEdit(three, withPool([bench.id, dip.id]), { chest: fly.id })).toEqual({
      chest: dip.id,
    });
    // After the pool's last exercise comes its first.
    expect(rotationAfterEdit(three, withPool([bench.id, fly.id]), { chest: dip.id })).toEqual({
      chest: bench.id,
    });
  });

  it("forgets a pool that was emptied, and a slot that is gone", () => {
    expect(rotationAfterEdit(three, withPool([]), { chest: fly.id })).toEqual({});
    expect(rotationAfterEdit(three, three, { chest: fly.id, removed: bench.id })).toEqual({
      chest: fly.id,
    });
  });
});

describe("rolling over to a new day", () => {
  it("rollover advances only the pools that were trained", () => {
    const sunday = dayState(nov(15));
    const history = [logged(bench, nov(15), 10, 40, { planItemId: "chest" })];
    const result = rollOver({
      program: cycled,
      dayState: sunday,
      rotation: {},
      history,
      lookup,
      date: MONDAY,
    });
    expect(result.rotation).toEqual({ chest: fly.id });
    expect(result.dayState).toEqual(dayState(MONDAY));
    expect(result.records).toEqual([{ date: dateKey(nov(15)), planned: 6, done: 1 }]);
  });

  it("a pool moves on from the exercise it gave, wrapping round, wherever that now sits", () => {
    const trainedOn = (exercise: typeof bench, rotation: Record<string, string>, pool: string[]) =>
      rollOver({
        program: {
          ...cycled,
          days: cycled.days.map((day) => ({
            ...day,
            slots: day.slots.map((slot) => (slot.id === "chest" ? { ...slot, pool } : slot)),
          })),
        },
        dayState: dayState(nov(15)),
        rotation,
        history: [logged(exercise, nov(15), 10, 40, { planItemId: "chest" })],
        lookup,
        date: MONDAY,
      }).rotation;
    const pool = [bench.id, fly.id, dip.id];
    expect(trainedOn(dip, { chest: dip.id }, pool)).toEqual({ chest: bench.id });
    // An exercise was put in front of the pool during the day: Fly still follows Bench.
    expect(trainedOn(bench, {}, [dip.id, bench.id, fly.id])).toEqual({ chest: fly.id });
    // The exercise trained has since left the pool: the pool stays where it points.
    expect(trainedOn(bench, { chest: fly.id }, [fly.id, dip.id])).toEqual({ chest: fly.id });
  });

  it("a floating plan moves on once the day owes nothing, clearing skips, extras and pause", () => {
    const sunday = dayState(nov(15), {
      dayId: "a",
      skipped: ["delts"],
      extras: [{ id: "x", exId: dip.id }],
      paused: true,
    });
    const done = [10, 11, 12].map((h) =>
      logged(bench, nov(15, h), 10, 40, { planItemId: "chest" }),
    );
    const args = { program: cycled, dayState: sunday, rotation: {}, lookup, date: MONDAY };
    expect(rollOver({ ...args, history: done }).dayState).toEqual(dayState(MONDAY, { dayId: "b" }));
    expect(rollOver({ ...args, history: done.slice(1) }).dayState.dayId).toBe("a");
  });

  it("a floating plan wraps from its last day back to the first", () => {
    const onB = dayState(nov(15), { dayId: "b" });
    const result = rollOver({
      program: cycled,
      dayState: onB,
      rotation: {},
      history: [],
      lookup,
      date: MONDAY,
    });
    expect(result.dayState.dayId).toBe("a");
  });

  it("a floating day with nothing plannable does not hold the plan up", () => {
    const args = { program: cycled, rotation: {}, history: [], lookup, date: MONDAY };
    // Day B is empty.
    expect(rollOver({ ...args, dayState: dayState(nov(15), { dayId: "b" }) }).dayState.dayId).toBe(
      "a",
    );
    // Every exercise of day A was skipped.
    const skippedAll = dayState(nov(15), { dayId: "a", skipped: ["chest", "delts"] });
    expect(rollOver({ ...args, dayState: skippedAll }).dayState.dayId).toBe("b");
    // Every pool of day A is empty.
    const noPools: Program = {
      ...cycled,
      days: cycled.days.map((d) => ({ ...d, slots: d.slots.map((s) => ({ ...s, pool: [] })) })),
    };
    const onA = dayState(nov(15), { dayId: "a" });
    expect(rollOver({ ...args, program: noPools, dayState: onA }).dayState.dayId).toBe("b");
  });

  it("an untouched floating day with work on it comes back the next day", () => {
    const onA = dayState(nov(15), { dayId: "a" });
    const result = rollOver({
      program: cycled,
      dayState: onA,
      rotation: {},
      history: [],
      lookup,
      date: MONDAY,
    });
    expect(result.dayState.dayId).toBe("a");
  });

  it("records nothing for a day with no plan and no sets", () => {
    const tuesday = dayState(nov(17));
    const result = rollOver({
      program: fixedProgram,
      dayState: tuesday,
      rotation: {},
      history: [],
      lookup,
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
      program: floating,
      history: [benchSet(10)],
      date: nov(26),
    });
    expect(result.records).toEqual([{ date: dateKey(nov(16)), planned: 10, done: 1 }]);
  });

  describe("what a floating plan puts on record", () => {
    const from = (state: DayState, history: LoggedSet[] = []) =>
      rollOver({ ...input(), program: floating, dayState: state, history, date: nov(17) }).records;

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
