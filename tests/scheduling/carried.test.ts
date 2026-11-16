// A floating day that is not finished comes back the next day with only the rest.

import type { LoggedSet } from "@nabd/domain";
import { dateKey } from "@nabd/domain";
import { rollOver } from "@nabd/scheduling";
import { logged, nov, working } from "../support/builders";
import { EX } from "../support/exercises";
import { benchRow, floatingPushPull, flyRow, raiseRow } from "../support/programs";
import { MONDAY, benchSet, build, dayState, input } from "./fixtures";

const TUESDAY = nov(17);
const WEDNESDAY = nov(18);
const flySet = (day: number, hour: number): LoggedSet =>
  logged(EX.fly, nov(day, hour), 12, 10, { planItemId: flyRow.id });

/** Monday: bench's warm-up and one working set, and two of fly's three sets. */
const monday = (): LoggedSet[] => [
  benchSet(9, { setType: "warmup" }),
  benchSet(10),
  flySet(16, 11),
  flySet(16, 12),
];

/** Tuesday's day state after Monday ended unfinished. */
const afterMonday = (history = monday()) =>
  rollOver({ ...input(), program: floatingPushPull, history, date: TUESDAY });

/** Tuesday's plan, with what Monday left. */
const tuesday = (history = monday(), state = afterMonday(history).dayState) =>
  build(history, state, floatingPushPull);

describe("an unfinished floating day at rollover", () => {
  it("keeps, for each exercise, how many of its prescribed sets are done", () => {
    const { dayState: next, records } = afterMonday();
    expect(next).toEqual(dayState(TUESDAY, { carried: { [benchRow.id]: 2, [flyRow.id]: 2 } }));
    expect(records).toEqual([{ date: dateKey(MONDAY), planned: 10, done: 4 }]);
  });

  it("adds each day's sets to what the earlier days left", () => {
    const history = [...monday(), benchSet(10, { setType: "working" })];
    const tuesdaySet = logged(EX.bench, nov(17, 10), 10, 40, { planItemId: benchRow.id });
    const state = afterMonday(history).dayState;
    const next = rollOver({
      ...input(),
      program: floatingPushPull,
      dayState: state,
      history: [...history, tuesdaySet],
      date: WEDNESDAY,
    });
    expect(next.dayState.carried).toEqual({ [benchRow.id]: 4, [flyRow.id]: 2 });
  });

  it("counts no more than an exercise prescribes, and nothing for an extra", () => {
    const sets = [9, 10, 11, 12, 13].map((hour) => benchSet(hour));
    const extra = logged(EX.dip, nov(16, 14), 12, null, { planItemId: "x" });
    const { dayState: next } = rollOver({
      ...input(),
      program: floatingPushPull,
      dayState: dayState(MONDAY, { extras: [{ id: "x", exId: EX.dip.id }] }),
      history: [...sets, extra],
      date: TUESDAY,
    });
    expect(next.carried).toEqual({ [benchRow.id]: 4 });
  });

  it("clears them once the plan moves on, and has none on a weekday plan", () => {
    const all = [benchRow, flyRow, raiseRow].flatMap((item, index) =>
      Array.from({ length: item.sets.length }, (_, set) =>
        logged([EX.bench, EX.fly, EX.raise][index]!, nov(16, 9 + set), 10, 10, {
          planItemId: item.id,
          setType: item.sets[set]!.type,
        }),
      ),
    );
    const finished = rollOver({
      ...input(),
      program: floatingPushPull,
      history: all,
      date: TUESDAY,
    });
    expect(finished.dayState).toEqual(dayState(TUESDAY, { dayId: "wed" }));
    expect(rollOver({ ...input(), history: monday(), date: TUESDAY }).dayState.carried).toEqual({});
  });

  it("returns an exercise that was skipped as owed again, with what was done of it", () => {
    const state = dayState(MONDAY, { skipped: [benchRow.id, raiseRow.id] });
    const { dayState: next } = rollOver({
      ...input(),
      program: floatingPushPull,
      dayState: state,
      history: [flySet(16, 11), benchSet(10)],
      date: TUESDAY,
    });
    expect(next.skipped).toEqual([]);
    expect(next.carried).toEqual({ [benchRow.id]: 1, [flyRow.id]: 1 });
  });
});

describe("the day that comes back", () => {
  it("owes each exercise only the rest, starting at the right set", () => {
    const plan = tuesday();
    const bench = plan.item(benchRow.id)!;
    expect(bench).toMatchObject({ planned: 4, carried: 2, done: 2, owed: 2, remaining: 2 });
    // The warm-up was done on Monday: the first working set comes next.
    expect(bench.nextSet).toEqual(working(8, 12));
    expect(bench.workingSetsDone).toBe(1);
    expect(plan.item(flyRow.id)).toMatchObject({ done: 2, owed: 1, remaining: 1 });
    expect(plan.item(raiseRow.id)).toMatchObject({ done: 0, owed: 3, remaining: 3 });
    expect([plan.setsPlanned, plan.setsRemaining, plan.setsDone]).toEqual([6, 6, 0]);
    expect(plan.nextItem?.id).toBe(benchRow.id);
  });

  it("counts today's sets after what was carried, and is done when the rest is", () => {
    const today = [
      logged(EX.bench, nov(17, 10), 9, 40, { planItemId: benchRow.id }),
      logged(EX.bench, nov(17, 11), 9, 40, { planItemId: benchRow.id }),
    ];
    const plan = tuesday([...monday(), ...today]);
    expect(plan.item(benchRow.id)).toMatchObject({ done: 4, remaining: 0, status: "done" });
    expect(plan.item(benchRow.id)!.logged).toHaveLength(2);
    expect(plan.plannedSetsDone).toBe(2);
    expect(plan.nextItem?.id).toBe(flyRow.id);
  });

  it("shows an exercise finished earlier as done, owing nothing", () => {
    const state = dayState(TUESDAY, { carried: { [flyRow.id]: 3 } });
    const plan = build(monday(), state, floatingPushPull);
    expect(plan.item(flyRow.id)).toMatchObject({ status: "done", remaining: 0, owed: 0 });
    expect(plan.item(flyRow.id)!.nextSet).toBeNull();
    expect(plan.setsRemaining).toBe(4 + 3);
  });

  it("is complete when everything owed is done, though nothing is logged that day", () => {
    const state = dayState(TUESDAY, {
      carried: { [benchRow.id]: 4, [flyRow.id]: 3, [raiseRow.id]: 3 },
    });
    const plan = build([], state, floatingPushPull);
    expect([plan.isComplete, plan.hasWork, plan.setsDone]).toEqual([true, false, 0]);
  });

  it("records what it owed and what it did, so a finished remainder is 100%", () => {
    const state = afterMonday().dayState;
    const rest = [
      ...[11, 12].map((hour) =>
        logged(EX.bench, nov(17, hour), 9, 40, { planItemId: benchRow.id }),
      ),
      flySet(17, 13),
      ...[14, 15, 16].map((hour) =>
        logged(EX.raise, nov(17, hour), 9, 10, { planItemId: raiseRow.id }),
      ),
    ];
    const plan = tuesday([...monday(), ...rest], state);
    expect(plan.ledger.record()).toEqual({ date: dateKey(TUESDAY), planned: 6, done: 6 });
    // Half-way: 3 of the 6 owed.
    const half = tuesday([...monday(), ...rest.slice(0, 3)], state);
    expect(half.ledger.record()).toEqual({ date: dateKey(TUESDAY), planned: 6, done: 3 });
  });

  it("is not on record until a set is logged that day, however much it carries", () => {
    expect(tuesday().ledger.record()).toBeNull();
    expect(tuesday().ledger.record(true)).toEqual({ date: dateKey(TUESDAY), planned: 6, done: 0 });
  });
});
