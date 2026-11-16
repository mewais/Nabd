import type { DayState, Exercise, LoggedSet, Program } from "@nabd/domain";
import { dateKey } from "@nabd/domain";
import { TodayPlan, resolveDay, rollOver, rotatedExercise } from "@nabd/scheduling";
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

const dayState = (date: Date, overrides: Partial<DayState> = {}): DayState => ({
  date: dateKey(date),
  floatingIndex: 0,
  skipped: [],
  extras: [],
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
    expect(resolveDay(fixedProgram, MONDAY, 0)?.id).toBe("mon");
    expect(resolveDay(fixedProgram, nov(17), 0)).toBeNull();
    expect(resolveDay(fixedProgram, nov(18), 5)?.id).toBe("wed");
  });

  it("floating schedule walks the days in order and wraps", () => {
    const floating: Program = { ...fixedProgram, schedule: "floating" };
    expect(resolveDay(floating, MONDAY, 0)?.id).toBe("mon");
    expect(resolveDay(floating, MONDAY, 1)?.id).toBe("wed");
    expect(resolveDay(floating, MONDAY, 2)?.id).toBe("mon");
    expect(resolveDay({ ...floating, days: [] }, MONDAY, 3)).toBeNull();
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
    expect(result.record).toEqual({ date: dateKey(nov(15)), planned: 6, done: 1 });
  });

  it("a floating plan moves on only after a completed day", () => {
    const sunday = dayState(nov(15), { skipped: ["delts"], extras: [{ id: "x", exId: dip.id }] });
    const done = [10, 11, 12].map((h) =>
      logged(bench, nov(15, h), 10, 40, { planItemId: "chest" }),
    );
    const args = { program: cycled, dayState: sunday, rotation: {}, lookup, date: MONDAY };
    expect(rollOver({ ...args, history: done }).dayState).toEqual(
      dayState(MONDAY, { floatingIndex: 1 }),
    );
    expect(rollOver({ ...args, history: done.slice(1) }).dayState.floatingIndex).toBe(0);
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
    expect(result.record).toBeNull();
    expect(result.rotation).toEqual({});
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
