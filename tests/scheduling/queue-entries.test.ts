import type { Exercise, Program, RotationState } from "@nabd/domain";
import { exercise, logged, nov, prescription, workingSets } from "../support/builders";
import { EX } from "../support/exercises";
import { benchRow, cycledPlan, pushPull } from "../support/programs";
import { MONDAY, benchSet, build, dayState } from "./fixtures";

describe("sets whose plan item no longer exists", () => {
  const orphan = (ex: Exercise, hour: number, planItemId: string | null = "gone") =>
    logged(ex, nov(16, hour), 10, 40, { planItemId });

  it("count toward an untouched item of the same exercise", () => {
    // Bench was removed from the plan and added back: a new row id.
    const plan = build([orphan(EX.bench, 9), orphan(EX.bench, 10)]);
    expect(plan.item(benchRow.id)!.done).toBe(2);
    expect(plan.setsRemaining).toBe(8);
    expect(plan.items).toHaveLength(3);
  });

  it("do not pile onto an item that has sets of its own", () => {
    const plan = build([benchSet(9), orphan(EX.bench, 10)]);
    expect(plan.item(benchRow.id)!.done).toBe(1);
    const unplanned = plan.items.at(-1)!;
    expect(unplanned).toMatchObject({ isExtra: true, done: 1, exercise: EX.bench });
    expect(plan.setsDone).toBe(2);
  });

  it("are listed as an unplanned exercise when the plan no longer has it", () => {
    const plan = build([orphan(EX.dip, 9), orphan(EX.dip, 10, null)]);
    const unplanned = plan.items.at(-1)!;
    expect(unplanned).toMatchObject({ isExtra: true, done: 2, exercise: EX.dip });
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
    const first = build([orphan(EX.dip, 9)]).items.at(-1)!;
    const plan = build([orphan(EX.dip, 9), orphan(EX.dip, 10, first.id)]);
    expect(plan.item(first.id)!.done).toBe(2);
    expect(plan.items).toHaveLength(4);
  });

  it("survive a switch of plan type", () => {
    const history = [benchSet(9), benchSet(10)];
    const slot = {
      id: "chest",
      muscle: "chest" as const,
      pool: [EX.fly.id, EX.bench.id],
      ...prescription(workingSets(3), { rest: 60 }),
    };
    const cycledNow: Program = {
      ...pushPull,
      type: "cycled",
      days: [{ ...pushPull.days[0]!, slots: [slot] }],
    };
    const plan = build(history, dayState(MONDAY), cycledNow);
    expect(plan.setsDone).toBe(2);
    expect(plan.item("chest")!.exercise).toBe(EX.fly);
    expect(plan.items.at(-1)).toMatchObject({ isExtra: true, exercise: EX.bench, done: 2 });
  });
});

describe("cycled slots", () => {
  const slot = {
    id: "chest",
    muscle: "chest" as const,
    pool: [EX.bench.id, EX.fly.id],
    ...prescription(workingSets(3), { rest: 60 }),
  };
  const withPool = (pool: string[]): Program => ({
    ...pushPull,
    type: "cycled",
    days: [{ ...pushPull.days[0]!, slots: [{ ...slot, pool }] }],
  });

  it("uses the slots (not leftover fixed exercises) and each pool's current exercise", () => {
    const plan = build([], dayState(MONDAY), cycledPlan, { chest: EX.fly.id });
    expect(plan.items.map((i) => [i.id, i.exercise.name, i.label])).toEqual([
      ["chest", "Dumbbell Fly", "Chest"],
      ["delts", "Lateral Raise", "Side Delts"],
    ]);
  });

  it("a pool gives the exercise its rotation names, and its first when that names none of it", () => {
    const chestOn = (rotation: RotationState): string =>
      build([], dayState(MONDAY), cycledPlan, rotation).item("chest")!.exercise.name;
    expect([chestOn({}), chestOn({ chest: EX.fly.id }), chestOn({ chest: EX.dip.id })]).toEqual([
      "Bench Press",
      "Dumbbell Fly",
      "Bench Press",
    ]);
  });

  it("a slot trained today stays on that exercise when its pool is edited", () => {
    const history = [logged(EX.bench, nov(16, 9), 10, 40, { planItemId: "chest" })];
    for (const pool of [[EX.fly.id, EX.bench.id], [EX.fly.id], []]) {
      const item = build(history, dayState(MONDAY), withPool(pool)).item("chest")!;
      expect(item.exercise).toBe(EX.bench);
      expect(item.done).toBe(1);
    }
  });

  it("an untrained slot follows its pool", () => {
    expect(
      build([], dayState(MONDAY), withPool([EX.fly.id, EX.bench.id])).item("chest")!.exercise,
    ).toBe(EX.fly);
  });

  it("slots with an empty pool are reported instead of vanishing", () => {
    const plan = build([], dayState(MONDAY), withPool([]));
    expect(plan.items).toEqual([]);
    expect(plan.emptySlots).toEqual(["chest"]);
    expect(build().emptySlots).toEqual([]);
  });
});
