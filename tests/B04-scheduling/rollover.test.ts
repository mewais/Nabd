import type { Program } from "@nabd/domain";
import { dateKey } from "@nabd/domain";
import { dayIdAfterEdit, rollOver } from "@nabd/scheduling";
import { logged, nov } from "../support/domain-factories";
import {
  MONDAY,
  bench,
  benchSet,
  cycled,
  dayState,
  dip,
  fixedProgram,
  floating,
  input,
  lookup,
} from "./fixtures";

describe("a floating plan across plan edits", () => {
  it("stays on its day when the days around it are edited", () => {
    const [mon, wed] = floating.days as [Program["days"][0], Program["days"][0]];
    const reordered: Program = { ...floating, days: [{ ...wed, id: "new" }, wed, mon] };
    expect(dayIdAfterEdit(floating, reordered, null)).toBe("mon");
    expect(dayIdAfterEdit(floating, reordered, "wed")).toBe("wed");
  });

  it("removing the current floating day lands on the day that took its place", () => {
    expect(dayIdAfterEdit(floating, { ...floating, days: [floating.days[1]!] }, "mon")).toBe("wed");
    expect(dayIdAfterEdit(floating, { ...floating, days: [floating.days[0]!] }, "wed")).toBe("mon");
    expect(dayIdAfterEdit(floating, { ...floating, days: [] }, "wed")).toBeNull();
  });

  it("a weekday plan's edits leave the remembered floating day alone", () => {
    expect(dayIdAfterEdit(fixedProgram, { ...fixedProgram, days: [] }, "wed")).toBe("wed");
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
    expect(result.rotation).toEqual({ chest: 1 });
    expect(result.dayState).toEqual(dayState(MONDAY));
    expect(result.records).toEqual([{ date: dateKey(nov(15)), planned: 6, done: 1 }]);
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
    const result = rollOver({ ...input(), program: floating, date: nov(26) });
    expect(result.records).toEqual([{ date: dateKey(nov(16)), planned: 10, done: 0 }]);
  });
});
