import type { DayState, Exercise, LoggedSet, Program } from "@nabd/domain";
import { dateKey, freshDayState } from "@nabd/domain";
import { TodayPlan, dayIdAfterEdit, resolveDay, rollOver, rotatedExercise } from "@nabd/scheduling";
import { exercise, logged, nov, row, working } from "../support/domain-factories";

const bench = exercise({ name: "Bench" });
const fly = exercise({ name: "Fly" });
const raise = exercise({ name: "Raise", group: "Shoulders", primary: ["side_delts"] });
const dip = exercise({ name: "Dip" });
const library = [bench, fly, raise, dip];
const lookup = (id: string): Exercise | undefined => library.find((e) => e.id === id);

const MONDAY = nov(16);
const threeSets = [working(8, 12), working(8, 12), working(8, 12)];
const benchRow = row(bench.id, [{ type: "warmup", a: 12 }, ...threeSets]);
const flyRow = row(fly.id, threeSets, { supersetId: "ss" });
const raiseRow = row(raise.id, threeSets, { supersetId: "ss" });

const fixedProgram: Program = {
  name: "P",
  type: "fixed",
  schedule: "weekday",
  days: [
    { id: "mon", name: "Push", weekday: 1, exercises: [benchRow, flyRow, raiseRow], slots: [] },
    { id: "wed", name: "Pull", weekday: 3, exercises: [row(dip.id, threeSets)], slots: [] },
  ],
};

const floating: Program = { ...fixedProgram, schedule: "floating" };

const dayState = (date: Date, overrides: Partial<DayState> = {}): DayState => ({
  ...freshDayState(date),
  ...overrides,
});

function build(
  history: LoggedSet[] = [],
  state: DayState = dayState(MONDAY),
  program: Program = fixedProgram,
  rotation = {},
): TodayPlan {
  return TodayPlan.build({ program, date: MONDAY, dayState: state, rotation, history, lookup });
}

const benchSet = (hour: number, overrides: Partial<LoggedSet> = {}): LoggedSet =>
  logged(bench, nov(16, hour), 10, 40, { planItemId: benchRow.id, ...overrides });

describe("resolving the day", () => {
  it("weekday schedule picks the day pinned to that weekday, or none", () => {
    expect(resolveDay(fixedProgram, MONDAY, null)?.id).toBe("mon");
    expect(resolveDay(fixedProgram, nov(17), null)).toBeNull();
    expect(resolveDay(fixedProgram, nov(18), "mon")?.id).toBe("wed");
  });

  it("floating schedule is on the day it remembers, or the first one", () => {
    expect(resolveDay(floating, MONDAY, null)?.id).toBe("mon");
    expect(resolveDay(floating, MONDAY, "wed")?.id).toBe("wed");
    expect(resolveDay(floating, MONDAY, "deleted")?.id).toBe("mon");
    expect(resolveDay({ ...floating, days: [] }, MONDAY, "wed")).toBeNull();
  });

  it("a floating plan stays on its day when the days around it are edited", () => {
    const [mon, wed] = floating.days as [Program["days"][0], Program["days"][0]];
    const extra = { ...wed, id: "new" };
    const reordered: Program = { ...floating, days: [extra, wed, mon] };
    expect(resolveDay(reordered, MONDAY, dayIdAfterEdit(floating, reordered, null))?.id).toBe(
      "mon",
    );
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

  it("a rotation pointer walks its pool and wraps; an empty pool yields nothing", () => {
    expect(rotatedExercise("s", ["a", "b", "c"], {})).toBe("a");
    expect(rotatedExercise("s", ["a", "b", "c"], { s: 4 })).toBe("b");
    expect(rotatedExercise("s", [], { s: 1 })).toBeNull();
  });
});

describe("TodayPlan for a fixed day", () => {
  it("lists the day's exercises with every prescribed set, warm-ups included", () => {
    const plan = build();
    expect(plan.dayName).toBe("Push");
    expect(plan.items.map((i) => i.exercise.name)).toEqual(["Bench", "Fly", "Raise"]);
    expect(plan.items.map((i) => i.planned)).toEqual([4, 3, 3]);
    expect(plan.setsPlanned).toBe(10);
    expect(plan.setsRemaining).toBe(10);
    expect(plan.nextItem?.id).toBe(benchRow.id);
    expect(plan.nextItem?.nextSet).toEqual({ type: "warmup", a: 12 });
  });

  it("is empty on a rest day and drops exercises missing from the library", () => {
    expect(
      TodayPlan.build({ ...input(), date: nov(17), dayState: dayState(nov(17)) }).items,
    ).toEqual([]);
    const orphan: Program = {
      ...fixedProgram,
      days: [{ ...fixedProgram.days[0]!, exercises: [row("gone", threeSets), benchRow] }],
    };
    expect(build([], dayState(MONDAY), orphan).items.map((i) => i.exercise.name)).toEqual([
      "Bench",
    ]);
  });

  it("counts today's sets toward their plan item — and only today's", () => {
    const yesterday = logged(bench, nov(15), 10, 40, { planItemId: benchRow.id });
    const plan = build([yesterday, benchSet(10, { setType: "warmup" }), benchSet(11)]);
    const item = plan.item(benchRow.id)!;
    expect(item.done).toBe(2);
    expect(item.remaining).toBe(2);
    expect(item.workingSetsDone).toBe(1);
    expect(item.nextSet).toEqual(working(8, 12));
    expect(item.status).toBe("pending");
    expect(plan.setsDone).toBe(2);
  });

  it("marks an exercise done once every prescribed set is logged, and allows extra sets", () => {
    const sets = [10, 11, 12, 13, 14].map((h) => benchSet(h));
    const item = build(sets).item(benchRow.id)!;
    expect(item.status).toBe("done");
    expect(item.remaining).toBe(0);
    expect(item.nextSet).toBeNull();
  });

  it("a skipped exercise owes nothing and is not offered next", () => {
    const plan = build([], dayState(MONDAY, { skipped: [benchRow.id] }));
    expect(plan.item(benchRow.id)!.status).toBe("skipped");
    expect(plan.setsPlanned).toBe(6);
    expect(plan.nextItem?.id).toBe(flyRow.id);
  });

  it("includes exercises added just for today as open-ended extras", () => {
    const plan = build(
      [logged(dip, nov(16, 15), 12, null, { planItemId: "x1" })],
      dayState(MONDAY, { extras: [{ id: "x1", exId: dip.id }] }),
    );
    const extra = plan.item("x1")!;
    expect(extra.isExtra).toBe(true);
    expect(extra.planned).toBe(0);
    expect(extra.done).toBe(1);
    expect(plan.setsPlanned).toBe(10);
  });

  it("is complete only when nothing is owed and something was done", () => {
    const allSkipped = dayState(MONDAY, { skipped: [benchRow.id, flyRow.id, raiseRow.id] });
    expect(build([], allSkipped).isComplete).toBe(false);
    const onlyBench = dayState(MONDAY, { skipped: [flyRow.id, raiseRow.id] });
    expect(
      build(
        [10, 11, 12, 13].map((h) => benchSet(h)),
        onlyBench,
      ).isComplete,
    ).toBe(true);
  });
});

describe("where the logger goes after a set", () => {
  const flySet = (hour: number) => logged(fly, nov(16, hour), 12, 10, { planItemId: flyRow.id });
  const raiseSet = (hour: number) =>
    logged(raise, nov(16, hour), 12, 5, { planItemId: raiseRow.id });

  it("stays on the exercise while it owes sets", () => {
    expect(build([benchSet(10)]).focusAfter(benchRow.id)?.id).toBe(benchRow.id);
  });

  it("moves to the next exercise once it is finished", () => {
    const plan = build([10, 11, 12, 13].map((h) => benchSet(h)));
    expect(plan.focusAfter(benchRow.id)?.id).toBe(flyRow.id);
  });

  it("alternates between superset partners", () => {
    expect(build([flySet(10)]).focusAfter(flyRow.id)?.id).toBe(raiseRow.id);
    expect(build([flySet(10), raiseSet(11)]).focusAfter(raiseRow.id)?.id).toBe(flyRow.id);
  });

  it("stays on an extra, and returns nothing when the day is finished", () => {
    const withExtra = build([], dayState(MONDAY, { extras: [{ id: "x1", exId: dip.id }] }));
    expect(withExtra.focusAfter("x1")?.id).toBe("x1");
    const state = dayState(MONDAY, { skipped: [flyRow.id, raiseRow.id] });
    const finished = build(
      [10, 11, 12, 13].map((h) => benchSet(h)),
      state,
    );
    expect(finished.focusAfter(benchRow.id)).toBeNull();
  });
});

describe("cycled days and rollover", () => {
  const cycled: Program = {
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
          { id: "chest", muscle: "chest", pool: [bench.id, fly.id], ...sets() },
          { id: "delts", muscle: "side_delts", pool: [raise.id], ...sets() },
          { id: "empty", muscle: "lats", pool: [], ...sets() },
        ],
      },
      { id: "b", name: "B", weekday: null, exercises: [], slots: [] },
    ],
  };

  it("uses the slots (not leftover fixed exercises) and each pool's current exercise", () => {
    const plan = build([], dayState(MONDAY), cycled, { chest: 1 });
    expect(plan.items.map((i) => [i.id, i.exercise.name, i.label])).toEqual([
      ["chest", "Fly", "Chest"],
      ["delts", "Raise", "Side Delts"],
    ]);
  });

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
});

describe("the completion record", () => {
  it("counts only planned sets, each exercise capped at its prescription", () => {
    const history = [
      // Five bench sets against four prescribed, and an extra exercise on top.
      ...[9, 10, 11, 12, 13].map((h) => benchSet(h)),
      logged(dip, nov(16, 15), 12, null, { planItemId: "x1" }),
    ];
    const plan = build(history, dayState(MONDAY, { extras: [{ id: "x1", exId: dip.id }] }));
    expect(plan.setsDone).toBe(6);
    expect(plan.record).toEqual({ date: dateKey(MONDAY), planned: 10, done: 4 });
  });

  it("a skipped exercise still counts as planned; a day without a plan has no record", () => {
    const skipped = build([], dayState(MONDAY, { skipped: [flyRow.id] }));
    expect(skipped.record).toEqual({ date: dateKey(MONDAY), planned: 10, done: 0 });
    const tuesday = TodayPlan.build({ ...input(), date: nov(17), dayState: dayState(nov(17)) });
    expect(tuesday.record).toBeNull();
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

describe("sets whose plan item no longer exists", () => {
  const orphan = (ex: Exercise, hour: number, planItemId: string | null = "gone") =>
    logged(ex, nov(16, hour), 10, 40, { planItemId });

  it("count toward an untouched item of the same exercise", () => {
    // Bench was removed from the plan and added back: a new row id.
    const plan = build([orphan(bench, 9), orphan(bench, 10)]);
    expect(plan.item(benchRow.id)!.done).toBe(2);
    expect(plan.setsRemaining).toBe(8);
    expect(plan.items).toHaveLength(3);
  });

  it("do not pile onto an item that has sets of its own", () => {
    const plan = build([benchSet(9), orphan(bench, 10)]);
    expect(plan.item(benchRow.id)!.done).toBe(1);
    const unplanned = plan.items.at(-1)!;
    expect(unplanned).toMatchObject({ isExtra: true, done: 1, exercise: bench });
    expect(plan.setsDone).toBe(2);
  });

  it("are listed as an unplanned exercise when the plan no longer has it", () => {
    const plan = build([orphan(dip, 9), orphan(dip, 10, null)]);
    const unplanned = plan.items.at(-1)!;
    expect(unplanned).toMatchObject({ isExtra: true, done: 2, exercise: dip });
    expect(plan.setsDone).toBe(2);
    expect(plan.setsRemaining).toBe(10);
  });

  it("further sets logged on the unplanned exercise stay with it", () => {
    const first = build([orphan(dip, 9)]).items.at(-1)!;
    const plan = build([orphan(dip, 9), orphan(dip, 10, first.id)]);
    expect(plan.item(first.id)!.done).toBe(2);
    expect(plan.items).toHaveLength(4);
  });

  it("survive a switch of plan type", () => {
    const history = [benchSet(9), benchSet(10)];
    const slot = { id: "chest", muscle: "chest" as const, pool: [fly.id, bench.id], ...sets() };
    const cycledNow: Program = {
      ...fixedProgram,
      type: "cycled",
      days: [{ ...fixedProgram.days[0]!, slots: [slot] }],
    };
    const plan = build(history, dayState(MONDAY), cycledNow);
    expect(plan.setsDone).toBe(2);
    expect(plan.item("chest")!.exercise).toBe(fly);
    expect(plan.items.at(-1)).toMatchObject({ isExtra: true, exercise: bench, done: 2 });
  });
});

describe("cycled slots during the day", () => {
  const slot = { id: "chest", muscle: "chest" as const, pool: [bench.id, fly.id], ...sets() };
  const withPool = (pool: string[]): Program => ({
    ...fixedProgram,
    type: "cycled",
    days: [{ ...fixedProgram.days[0]!, slots: [{ ...slot, pool }] }],
  });

  it("a slot trained today stays on that exercise when its pool is edited", () => {
    const history = [logged(bench, nov(16, 9), 10, 40, { planItemId: "chest" })];
    for (const pool of [[fly.id, bench.id], [fly.id], []]) {
      const item = build(history, dayState(MONDAY), withPool(pool)).item("chest")!;
      expect(item.exercise).toBe(bench);
      expect(item.done).toBe(1);
    }
  });

  it("an untrained slot follows its pool", () => {
    expect(build([], dayState(MONDAY), withPool([fly.id, bench.id])).item("chest")!.exercise).toBe(
      fly,
    );
  });

  it("slots with an empty pool are reported instead of vanishing", () => {
    const plan = build([], dayState(MONDAY), withPool([]));
    expect(plan.items).toEqual([]);
    expect(plan.emptySlots).toEqual(["chest"]);
    expect(build().emptySlots).toEqual([]);
  });
});

describe("a day where everything was skipped", () => {
  it("is told apart from a rest day and from a finished day", () => {
    const allSkipped = dayState(MONDAY, { skipped: [benchRow.id, flyRow.id, raiseRow.id] });
    expect(build([], allSkipped).isAllSkipped).toBe(true);
    expect(build([], dayState(MONDAY, { skipped: [benchRow.id] })).isAllSkipped).toBe(false);
    expect(TodayPlan.build({ ...input(), date: nov(17) }).isAllSkipped).toBe(false);
  });
});

function sets() {
  return { repMode: "range" as const, intensity: "none" as const, rest: 60, sets: threeSets };
}

function input() {
  return {
    program: fixedProgram,
    date: MONDAY,
    dayState: dayState(MONDAY),
    rotation: {},
    history: [],
    lookup,
  };
}
