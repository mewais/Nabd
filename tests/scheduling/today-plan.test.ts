import type { Exercise, LoggedSet, Program, RotationState } from "@nabd/domain";
import { dateKey } from "@nabd/domain";
import { TodayPlan } from "@nabd/scheduling";
import {
  exercise,
  logged,
  nov,
  row,
  threeSets,
  warmup,
  working,
} from "../support/domain-factories";
import {
  MONDAY,
  bench,
  benchRow,
  benchSet,
  build,
  cycled,
  dayState,
  dip,
  fixedProgram,
  floating,
  fly,
  flyRow,
  input,
  raise,
  raiseRow,
  slotSets,
} from "./fixtures";

describe("which day is today", () => {
  const dayOn = (program: Program, date: Date, dayId: string | null = null): string | null =>
    TodayPlan.build({ ...input(), program, date, dayState: dayState(date, { dayId }) }).dayName;

  it("weekday schedule picks the day pinned to that weekday, or none", () => {
    expect(dayOn(fixedProgram, MONDAY)).toBe("Push");
    expect(dayOn(fixedProgram, nov(17))).toBeNull();
    expect(dayOn(fixedProgram, nov(18), "mon")).toBe("Pull");
  });

  it("floating schedule is on the day it remembers, or the first one", () => {
    expect(dayOn(floating, MONDAY)).toBe("Push");
    expect(dayOn(floating, MONDAY, "wed")).toBe("Pull");
    expect(dayOn(floating, MONDAY, "deleted")).toBe("Push");
    expect(dayOn({ ...floating, days: [] }, MONDAY, "wed")).toBeNull();
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
    expect(plan.nextItem?.nextSet).toEqual(warmup(12));
  });

  it("is empty on a rest day and drops exercises missing from the library", () => {
    expect(
      TodayPlan.build({ ...input(), date: nov(17), dayState: dayState(nov(17)) }).items,
    ).toEqual([]);
    const orphan: Program = {
      ...fixedProgram,
      days: [{ ...fixedProgram.days[0]!, exercises: [row("gone", threeSets()), benchRow] }],
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

  describe("which prescribed set comes next", () => {
    // Bench is a warm-up and three working sets.
    const next = (sets: LoggedSet[], program = fixedProgram) =>
      build(sets, dayState(MONDAY), program).item(benchRow.id)!.nextSet;
    const warmupSet = benchSet(9, { setType: "warmup" });

    it("follows the prescription in order", () => {
      expect(next([])?.type).toBe("warmup");
      expect(next([warmupSet])?.type).toBe("working");
    });

    it("is the warm-up when the warm-up is the set that was undone", () => {
      expect(next([benchSet(10), benchSet(11), benchSet(12)])?.type).toBe("warmup");
    });

    it("is a working set after the warm-up was taken out of the plan mid-day", () => {
      const noWarmup: Program = {
        ...fixedProgram,
        days: [
          { ...fixedProgram.days[0]!, exercises: [{ ...benchRow, sets: threeSets() }] },
          fixedProgram.days[1]!,
        ],
      };
      expect(next([warmupSet, benchSet(10)], noWarmup)?.type).toBe("working");
      // With every set logged it stays done, whatever kinds the sets were.
      const item = build([warmupSet, benchSet(10), benchSet(11)], dayState(MONDAY), noWarmup).item(
        benchRow.id,
      )!;
      expect(item).toMatchObject({ status: "done", nextSet: null });
    });
  });

  it("a skipped exercise owes nothing and is not offered next", () => {
    const plan = build([], dayState(MONDAY, { skipped: [benchRow.id] }));
    expect(plan.item(benchRow.id)!.status).toBe("skipped");
    expect(plan.setsPlanned).toBe(6);
    expect(plan.plannedSetsDone).toBe(0);
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

  it("stays on a finished exercise the user chose to do more of, superset or not", () => {
    const more = build([9, 10, 11, 12, 13].map((h) => benchSet(h)));
    expect(more.focusAfter(benchRow.id)?.id).toBe(benchRow.id);
    const moreFly = build([9, 10, 11, 12].map(flySet));
    expect(moreFly.focusAfter(flyRow.id)?.id).toBe(flyRow.id);
  });

  it("stays on an extra, and returns nothing when the day is finished", () => {
    const withExtra = build(
      [logged(dip, nov(16, 15), 12, null, { planItemId: "x1" })],
      dayState(MONDAY, { extras: [{ id: "x1", exId: dip.id }] }),
    );
    expect(withExtra.focusAfter("x1")?.id).toBe("x1");
    const state = dayState(MONDAY, { skipped: [flyRow.id, raiseRow.id] });
    const finished = build(
      [10, 11, 12, 13].map((h) => benchSet(h)),
      state,
    );
    expect(finished.focusAfter(benchRow.id)).toBeNull();
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
    expect(plan.plannedSetsDone).toBe(4);
    expect(plan.record()).toEqual({ date: dateKey(MONDAY), planned: 10, done: 4 });
  });

  it("a skipped exercise still counts as planned; a day without a plan has no record", () => {
    const skipped = build([], dayState(MONDAY, { skipped: [flyRow.id] }));
    expect(skipped.record()).toEqual({ date: dateKey(MONDAY), planned: 10, done: 0 });
    const tuesday = TodayPlan.build({ ...input(), date: nov(17), dayState: dayState(nov(17)) });
    expect(tuesday.record()).toBeNull();
  });

  it("a floating day is only on record once it has a set, or the plan has moved past it", () => {
    const idle = build([], dayState(MONDAY), floating);
    expect(idle.record()).toBeNull();
    expect(idle.record(true)).toEqual({ date: dateKey(MONDAY), planned: 10, done: 0 });
    expect(build([benchSet(9)], dayState(MONDAY), floating).record()).toEqual({
      date: dateKey(MONDAY),
      planned: 10,
      done: 1,
    });
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

  it("are still listed once their exercise has been deleted from the library", () => {
    const deleted = exercise({ name: "Garage Carry", primary: ["forearms"], secondary: [] });
    const plan = build([orphan(deleted, 9), orphan(deleted, 10)]);
    const unplanned = plan.items.at(-1)!;
    expect(unplanned).toMatchObject({ isExtra: true, done: 2 });
    expect(unplanned.exercise).toMatchObject({ id: deleted.id, name: "Garage Carry" });
    expect(plan.setsDone).toBe(2);
  });

  it("further sets logged on the unplanned exercise stay with it", () => {
    const first = build([orphan(dip, 9)]).items.at(-1)!;
    const plan = build([orphan(dip, 9), orphan(dip, 10, first.id)]);
    expect(plan.item(first.id)!.done).toBe(2);
    expect(plan.items).toHaveLength(4);
  });

  it("survive a switch of plan type", () => {
    const history = [benchSet(9), benchSet(10)];
    const slot = { id: "chest", muscle: "chest" as const, pool: [fly.id, bench.id], ...slotSets() };
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

describe("cycled slots", () => {
  const slot = { id: "chest", muscle: "chest" as const, pool: [bench.id, fly.id], ...slotSets() };
  const withPool = (pool: string[]): Program => ({
    ...fixedProgram,
    type: "cycled",
    days: [{ ...fixedProgram.days[0]!, slots: [{ ...slot, pool }] }],
  });

  it("uses the slots (not leftover fixed exercises) and each pool's current exercise", () => {
    const plan = build([], dayState(MONDAY), cycled, { chest: fly.id });
    expect(plan.items.map((i) => [i.id, i.exercise.name, i.label])).toEqual([
      ["chest", "Fly", "Chest"],
      ["delts", "Raise", "Side Delts"],
    ]);
  });

  it("a pool gives the exercise its rotation names, and its first when that names none of it", () => {
    const chestOn = (rotation: RotationState): string =>
      build([], dayState(MONDAY), cycled, rotation).item("chest")!.exercise.name;
    expect([chestOn({}), chestOn({ chest: fly.id }), chestOn({ chest: dip.id })]).toEqual([
      "Bench",
      "Fly",
      "Bench",
    ]);
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
