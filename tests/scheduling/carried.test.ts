// A floating day that is not finished comes back the next day with only the rest.

import type { LoggedSet, Program } from "@nabd/domain";
import { NO_SETS, dateKey } from "@nabd/domain";
import { rollOver, rotationAfterEdit } from "@nabd/scheduling";
import { carry, logged, nov, visit, warmup, working } from "../support/builders";
import { EX } from "../support/exercises";
import { benchRow, cycledPlan, floatingPushPull, flyRow, raiseRow } from "../support/programs";
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

/** What Monday leaves behind. */
const mondayVisit = () =>
  visit(MONDAY, {
    [benchRow.id]: carry(EX.bench.id, { warmup: 1, working: 1 }),
    [flyRow.id]: carry(EX.fly.id, { working: 2 }),
  });

/** Tuesday's day state after Monday ended unfinished. */
const afterMonday = (history = monday(), program = floatingPushPull) =>
  rollOver({ ...input(), program, history, date: TUESDAY });

/** Tuesday's plan, with what Monday left. */
const tuesday = (history = monday(), state = afterMonday(history).dayState) =>
  build(history, state, floatingPushPull);

describe("an unfinished floating day at rollover", () => {
  it("keeps, for each exercise, how many of its prescribed sets of each kind are done", () => {
    const { dayState: next, records } = afterMonday();
    expect(next).toEqual(dayState(TUESDAY, { carried: mondayVisit() }));
    expect(records).toEqual([{ date: dateKey(MONDAY), planned: 10, done: 4 }]);
  });

  it("adds each day's sets to what the earlier days left, in the visit begun on the first", () => {
    const history = [...monday(), benchSet(10, { setType: "working" })];
    // Logged on the visit's second day, so in the session it began on.
    const tuesdaySet = logged(EX.bench, nov(17, 10), 10, 40, {
      planItemId: benchRow.id,
      session: dateKey(MONDAY),
    });
    const state = afterMonday(history).dayState;
    const next = rollOver({
      ...input(),
      program: floatingPushPull,
      dayState: state,
      history: [...history, tuesdaySet],
      date: WEDNESDAY,
    });
    expect(next.dayState.carried).toEqual(
      visit(MONDAY, {
        [benchRow.id]: carry(EX.bench.id, { warmup: 1, working: 3 }),
        [flyRow.id]: carry(EX.fly.id, { working: 2 }),
      }),
    );
  });

  it("counts nothing for an extra", () => {
    const extra = logged(EX.dip, nov(16, 14), 12, null, { planItemId: "x" });
    const { dayState: next } = rollOver({
      ...input(),
      program: floatingPushPull,
      dayState: dayState(MONDAY, { extras: [{ id: "x", exId: EX.dip.id }] }),
      history: [benchSet(9), extra],
      date: TUESDAY,
    });
    expect(next.carried?.items).toEqual({ [benchRow.id]: carry(EX.bench.id, { working: 1 }) });
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
    expect(rollOver({ ...input(), history: monday(), date: TUESDAY }).dayState.carried).toBeNull();
  });

  it("drops what a same-day switch to weekdays kept, at the weekday plan's next day", () => {
    const kept = dayState(MONDAY, { carried: mondayVisit() });
    const next = rollOver({ ...input(), dayState: kept, history: monday(), date: TUESDAY });
    expect(next.dayState.carried).toBeNull();
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
    expect(next.carried?.items).toEqual({
      [benchRow.id]: carry(EX.bench.id, { working: 1 }),
      [flyRow.id]: carry(EX.fly.id, { working: 1 }),
    });
  });
});

describe("sets of a kind the prescription was not waiting for", () => {
  // Bench prescribes a warm-up and three working sets; Monday logs four working sets.
  const fourWorking = () => [9, 10, 11, 12].map((hour) => benchSet(hour));
  /** Every Push exercise whole, except that bench's warm-up gave way to a fourth working set. */
  const allButTheWarmup = () => [
    ...fourWorking(),
    ...[13, 14, 15].map((hour) => flySet(16, hour)),
    ...[16, 17, 18].map((hour) =>
      logged(EX.raise, nov(16, hour), 12, 10, { planItemId: raiseRow.id }),
    ),
  ];

  it("leave the warm-up owed today, and next, and on record as not done", () => {
    const plan = build(fourWorking(), dayState(MONDAY), floatingPushPull);
    const bench = plan.item(benchRow.id)!;
    expect(bench).toMatchObject({ done: 3, remaining: 1, status: "pending" });
    expect(bench.nextSet).toEqual(warmup(12));
    expect(plan.ledger.record()).toEqual({ date: dateKey(MONDAY), planned: 10, done: 3 });
  });

  it("leave the same warm-up owed on the day that comes back", () => {
    const state = afterMonday(fourWorking()).dayState;
    expect(state.carried?.items).toEqual({ [benchRow.id]: carry(EX.bench.id, { working: 3 }) });
    const bench = tuesday(fourWorking(), state).item(benchRow.id)!;
    expect(bench).toMatchObject({ done: 3, owed: 1, remaining: 1 });
    expect(bench.nextSet).toEqual(warmup(12));
  });

  it("do not move a floating plan on, nor make the day complete", () => {
    const plan = build(allButTheWarmup(), dayState(MONDAY), floatingPushPull);
    expect([plan.isComplete, plan.setsRemaining]).toEqual([false, 1]);
    const next = rollOver({
      ...input(),
      program: floatingPushPull,
      history: allButTheWarmup(),
      date: TUESDAY,
    });
    // Push comes back on Tuesday (it would be "wed" had the plan moved on).
    expect(next.dayState).toMatchObject({ dayId: null, carried: { startedOn: dateKey(MONDAY) } });
    expect(next.records).toEqual([{ date: dateKey(MONDAY), planned: 10, done: 9 }]);
  });
});

describe("the day that comes back", () => {
  it("owes each exercise only the rest, starting at the right set", () => {
    const plan = tuesday();
    const bench = plan.item(benchRow.id)!;
    expect(bench).toMatchObject({ planned: 4, done: 2, owed: 2, remaining: 2 });
    expect(bench.carried).toEqual({ ...NO_SETS, warmup: 1, working: 1 });
    // The warm-up was done on Monday: the first working set comes next.
    expect(bench.nextSet).toEqual(working(8, 12));
    expect(bench.workingSetsDone).toBe(1);
    expect(plan.item(flyRow.id)).toMatchObject({ done: 2, owed: 1, remaining: 1 });
    expect(plan.item(raiseRow.id)).toMatchObject({ done: 0, owed: 3, remaining: 3 });
    expect([plan.setsPlanned, plan.setsRemaining, plan.setsLogged]).toEqual([6, 6, 0]);
    expect(plan.nextItem?.id).toBe(benchRow.id);
  });

  it("continues the session the visit began in, which today's sets belong to", () => {
    const plan = tuesday();
    expect([plan.date, plan.continuesFrom, plan.session]).toEqual([
      dateKey(TUESDAY),
      dateKey(MONDAY),
      dateKey(MONDAY),
    ]);
    const fresh = build([], dayState(TUESDAY), floatingPushPull);
    expect([fresh.continuesFrom, fresh.session]).toEqual([null, dateKey(TUESDAY)]);
  });

  it("keeps its sets by kind when the plan changes: a warm-up removed leaves the working set done", () => {
    const withoutWarmup: Program = {
      ...floatingPushPull,
      days: floatingPushPull.days.map((day) => ({
        ...day,
        exercises: day.exercises.map((row) =>
          row.id === benchRow.id ? { ...row, sets: row.sets.slice(1) } : row,
        ),
      })),
    };
    const bench = build(monday(), afterMonday().dayState, withoutWarmup).item(benchRow.id)!;
    expect(bench).toMatchObject({ planned: 3, done: 1, owed: 2, remaining: 2, workingSetsDone: 1 });
    expect(bench.nextSet).toEqual(working(8, 12));
  });

  it("does not count a slot's sets for an exercise it was not done on", () => {
    const slotSet = logged(EX.bench, nov(16, 10), 10, 40, { planItemId: "chest" });
    const state = afterMonday([slotSet], cycledPlan).dayState;
    expect(state.carried?.items).toEqual({ chest: carry(EX.bench.id, { working: 1 }) });
    expect(build([slotSet], state, cycledPlan).item("chest")).toMatchObject({ done: 1, owed: 2 });

    // Bench leaves the pool: the slot moves on to fly, which was never done.
    const [dayA, dayB] = cycledPlan.days as [Program["days"][0], Program["days"][0]];
    const withoutBench: Program = {
      ...cycledPlan,
      days: [
        {
          ...dayA,
          slots: dayA.slots.map((s) => (s.id === "chest" ? { ...s, pool: [EX.fly.id] } : s)),
        },
        dayB,
      ],
    };
    const rotation = rotationAfterEdit(cycledPlan, withoutBench, {});
    const chest = build([slotSet], state, withoutBench, rotation).item("chest")!;
    expect(chest.exercise.id).toBe(EX.fly.id);
    expect(chest).toMatchObject({ carried: NO_SETS, done: 0, owed: 3, remaining: 3 });
    expect(build([slotSet], state, withoutBench, rotation).ledger.carryOver).toEqual({});
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
    const carried = visit(MONDAY, { [flyRow.id]: carry(EX.fly.id, { working: 3 }) });
    const plan = build(monday(), dayState(TUESDAY, { carried }), floatingPushPull);
    expect(plan.item(flyRow.id)).toMatchObject({ status: "done", remaining: 0, owed: 0 });
    expect(plan.item(flyRow.id)!.nextSet).toBeNull();
    expect(plan.setsRemaining).toBe(4 + 3);
  });

  it("is complete when everything owed is done, though nothing is logged that day", () => {
    const carried = visit(MONDAY, {
      [benchRow.id]: carry(EX.bench.id, { warmup: 1, working: 3 }),
      [flyRow.id]: carry(EX.fly.id, { working: 3 }),
      [raiseRow.id]: carry(EX.raise.id, { working: 3 }),
    });
    const plan = build([], dayState(TUESDAY, { carried }), floatingPushPull);
    expect([plan.isComplete, plan.hasWork, plan.setsLogged]).toEqual([true, false, 0]);
  });

  it("counts nothing carried on a weekday plan, which has no such memory", () => {
    const plan = build(monday(), dayState(MONDAY, { carried: mondayVisit() }));
    expect(plan.item(benchRow.id)).toMatchObject({ carried: NO_SETS, done: 2 });
    expect([plan.continuesFrom, plan.session]).toEqual([null, dateKey(MONDAY)]);
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
    expect(tuesday().ledger.closedRecord()).toEqual({
      date: dateKey(TUESDAY),
      planned: 6,
      done: 0,
    });
  });

  it("stands, so far, at what it owes: Progress shows what Today shows", () => {
    expect(tuesday().ledger.closedRecord()).toEqual({
      date: dateKey(TUESDAY),
      planned: 6,
      done: 0,
    });
  });
});
