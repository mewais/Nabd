// A whole day skipped (a day without the workout) or nudged on (a day off, worked
// after all): what the plan does with it, and how it goes on record.

import type { DayState, LoggedSet, Program } from "@nabd/domain";
import { dateKey } from "@nabd/domain";
import { TodayPlan, rollOver } from "@nabd/scheduling";
import { carry, logged, nov, visit } from "../support/builders";
import { EX } from "../support/exercises";
import { benchRow, cycledPlan, floatingPushPull } from "../support/programs";
import { MONDAY, dayState, input, pushPullOn } from "./fixtures";

const TUESDAY = nov(17);
const SATURDAY = nov(21);

const benchOn = (date: Date): LoggedSet =>
  logged(EX.bench, date, 10, 40, { planItemId: benchRow.id, date: dateKey(date) });

/** Rolling over from `state` to the next day. */
const roll = (state: DayState, date: Date, program: Program, history: LoggedSet[] = []) =>
  rollOver({ ...input(), program, dayState: state, history, date });

describe("a skipped day on a floating plan", () => {
  it("comes back the next day as it was, even an empty day that a workday would move on from", () => {
    const emptyDay = (override: DayState["override"]) => dayState(MONDAY, { dayId: "b", override });
    expect(roll(emptyDay(null), TUESDAY, cycledPlan).dayState.dayId).toBe("a");
    expect(roll(emptyDay("skipped"), TUESDAY, cycledPlan).dayState).toEqual(
      dayState(TUESDAY, { dayId: "b" }),
    );
  });

  it("comes back with what its visit already had behind it, owing only the rest", () => {
    const carried = visit(nov(13), { [benchRow.id]: carry(EX.bench.id, { working: 2 }) });
    const skipped = dayState(MONDAY, { carried, override: "skipped" });
    expect(roll(skipped, TUESDAY, floatingPushPull).dayState).toEqual(
      dayState(TUESDAY, { carried }),
    );
  });

  it("counts the sets logged on it by hand, and the visit carries them", () => {
    const skipped = dayState(MONDAY, { override: "skipped" });
    const next = roll(skipped, TUESDAY, floatingPushPull, [benchOn(nov(16, 10))]);
    expect(next.dayState.carried).toEqual(
      visit(MONDAY, { [benchRow.id]: carry(EX.bench.id, { working: 1 }) }),
    );
    expect(next.records).toEqual([{ date: dateKey(MONDAY), planned: 10, done: 1, optional: true }]);
  });
});

describe("a skipped day on a weekday plan", () => {
  const monday = (override: DayState["override"], history: LoggedSet[] = []) =>
    TodayPlan.build({ ...input(), dayState: dayState(MONDAY, { override }), history }).ledger;

  it("is on record as optional and owing nothing, where an idle workday is a missed one", () => {
    expect(monday(null).record()).toEqual({ date: dateKey(MONDAY), planned: 10, done: 0 });
    expect(monday("skipped").record()).toEqual({
      date: dateKey(MONDAY),
      planned: 0,
      done: 0,
      optional: true,
    });
  });

  it("counts like any day once a set is logged on it, still optional", () => {
    expect(monday("skipped", [benchOn(nov(16, 10))]).record()).toEqual({
      date: dateKey(MONDAY),
      planned: 10,
      done: 1,
      optional: true,
    });
  });
});

describe("a day off nudged on", () => {
  const saturday = (override: DayState["override"]) =>
    TodayPlan.build({
      ...input(),
      program: pushPullOn(6),
      date: SATURDAY,
      dayState: dayState(SATURDAY, { override }),
    }).ledger;

  it("owes its plan like a workday, on record as optional", () => {
    expect(saturday(null).record()).toBeNull();
    expect(saturday("nudged").record()).toEqual({
      date: dateKey(SATURDAY),
      planned: 10,
      done: 0,
      optional: true,
    });
  });

  it("moves a floating plan on from an empty day, as a workday does", () => {
    const emptySaturday = dayState(SATURDAY, { dayId: "b", override: "nudged" });
    expect(roll(emptySaturday, nov(22), cycledPlan).dayState.dayId).toBe("a");
  });
});

it("a nudged-on workday is just a workday, and a skipped day off just a day off", () => {
  const workday = TodayPlan.build({
    ...input(),
    dayState: dayState(MONDAY, { override: "nudged" }),
  });
  expect(workday.ledger.record()).toEqual({ date: dateKey(MONDAY), planned: 10, done: 0 });
  const dayOff = TodayPlan.build({
    ...input(),
    program: pushPullOn(6),
    date: SATURDAY,
    dayState: dayState(SATURDAY, { override: "skipped" }),
  });
  expect(dayOff.ledger.record()).toBeNull();
});
