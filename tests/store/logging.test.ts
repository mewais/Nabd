import { dateKey, DEFAULT_SETTINGS } from "@nabd/domain";
import { selectCoach } from "@nabd/store";
import { nov, threeSets, warmup } from "../support/builders";
import { CATALOG } from "../support/exercises";
import { catalogBenchRow, catalogFlyRow, catalogPushPull } from "../support/programs";
import { benchSet, boot } from "./fixtures";

describe("logging sets", () => {
  it("logs one set at a time against the plan item and saves it", async () => {
    const app = await boot();
    app.get().openSession();
    expect(app.get().session).toMatchObject({
      itemId: catalogBenchRow.id,
      reps: 8,
      weight: 0,
      trigger: "manual",
    });
    app.get().setReps(10);
    app.get().setWeight(40);
    await app.get().logSet();

    expect(app.get().history).toEqual([
      expect.objectContaining({
        exId: CATALOG.bench,
        exercise: "Barbell Bench Press",
        value: 10,
        weight: 40,
        date: dateKey(nov(16)),
        trigger: "manual",
        planItemId: catalogBenchRow.id,
        setType: "working",
      }),
    ]);
    expect(app.client.appendSet).toHaveBeenCalledTimes(1);
    expect(app.plan().item(catalogBenchRow.id)!.done).toBe(1);
    expect(app.plan().setsRemaining).toBe(5);
  });

  it("stays on the exercise, rests, then moves on when it is finished", async () => {
    const app = await boot();
    await app.log(catalogBenchRow.id, 1);
    expect(app.get().session!.itemId).toBe(catalogBenchRow.id);
    expect(app.get().session!.restRemaining(app.clock.now)).toBe(90);
    await app.get().logSet();
    await app.get().logSet();
    expect(app.get().session!.itemId).toBe(catalogFlyRow.id);
  });

  it("keeps the session open on the last exercise when the day is finished", async () => {
    const app = await boot();
    await app.log(catalogBenchRow.id, 3);
    await app.log(catalogFlyRow.id, 3);
    expect(app.plan().isComplete).toBe(true);
    expect(app.get().session!.itemId).toBe(catalogFlyRow.id);
  });

  it("weights are entered in the display unit and stepped by the user's increment", async () => {
    const app = await boot({
      program: catalogPushPull,
      settings: { ...DEFAULT_SETTINGS, weightUnit: "lb" },
    });
    app.get().openSession();
    app.get().setWeight(25);
    app.get().stepWeight(1);
    app.get().stepReps(1);
    await app.get().logSet();
    const [set] = app.get().history;
    expect(set!.value).toBe(9);
    expect(set!.weight! * 2.2046226218).toBeCloseTo(27.5, 2);
  });

  it("applies the coach's suggestion on request", async () => {
    const app = await boot({ program: catalogPushPull, history: [benchSet(nov(9, 10))] });
    app.get().openSession();
    expect(app.get().session).toMatchObject({ reps: 8, weight: 40 });
    expect(selectCoach(app.get()).adviceFor(app.plan().nextItem!)?.kind).toBe("add_reps");
    app.get().applyAdvice("primary");
    expect(app.get().session).toMatchObject({ reps: 9, weight: 40 });
    app.get().applyAdvice("alternative");
    expect(app.get().session).toMatchObject({ reps: 8, weight: 42.5 });
  });

  it("undo removes the set everywhere", async () => {
    const app = await boot();
    await app.log(catalogBenchRow.id, 2);
    await app.get().undoSet(app.get().history[0]!.id);
    expect(app.plan().item(catalogBenchRow.id)!.done).toBe(1);
    expect(app.data.history).toHaveLength(1);
  });

  it("ignores a typed number that no set could have", async () => {
    const app = await boot();
    app.get().openSession();
    app.get().setReps(10);
    app.get().setWeight(40);
    for (const reps of [0, 1000, Number.NaN]) app.get().setReps(reps);
    for (const weight of [-5, 99999, Number.NaN]) app.get().setWeight(weight);
    expect(app.get().session).toMatchObject({ reps: 10, weight: 40 });
  });

  describe("what the form holds after a set", () => {
    /** Bench with a warm-up before its three working sets, trained once before. */
    const warmedUp = async () => {
      const row = { ...catalogBenchRow, sets: [warmup(12), ...threeSets()] };
      const plan = {
        ...catalogPushPull,
        days: [{ ...catalogPushPull.days[0]!, exercises: [row, catalogFlyRow] }],
      };
      const lastTime = [
        benchSet(nov(9, 9), { value: 12, weight: 20, setType: "warmup" }),
        benchSet(nov(9, 10), { value: 10, weight: 35 }),
      ];
      const app = await boot({ program: plan, history: lastTime });
      app.get().openSession();
      return app;
    };

    it("the warm-up starts from the last warm-up, not from the working set", async () => {
      const app = await warmedUp();
      expect(app.get().session).toMatchObject({ reps: 12, weight: 20 });
    });

    it("the working set after the warm-up starts from the working set, not from the warm-up", async () => {
      const app = await warmedUp();
      app.get().setWeight(22.5);
      await app.get().logSet();
      expect(app.get().history.at(-1)).toMatchObject({ setType: "warmup", weight: 22.5 });
      expect(app.get().session).toMatchObject({ itemId: catalogBenchRow.id, reps: 10, weight: 35 });
    });

    it("between two sets of the same kind the form keeps what was just done", async () => {
      const app = await warmedUp();
      await app.get().logSet();
      app.get().setReps(11);
      app.get().setWeight(37.5);
      await app.get().logSet();
      expect(app.get().session).toMatchObject({
        itemId: catalogBenchRow.id,
        reps: 11,
        weight: 37.5,
      });
    });

    it("an extra set of a finished exercise keeps the form on that exercise", async () => {
      const app = await boot();
      await app.log(catalogBenchRow.id, 3);
      expect(app.get().session!.itemId).toBe(catalogFlyRow.id);
      await app.log(catalogBenchRow.id, 1);
      expect(app.plan().item(catalogBenchRow.id)!.done).toBe(4);
      expect(app.get().session!.itemId).toBe(catalogBenchRow.id);
    });
  });

  it("the form can switch exercises freely and close", async () => {
    const app = await boot();
    app.get().openSession();
    app.get().focusItem(catalogFlyRow.id);
    expect(app.get().session!.itemId).toBe(catalogFlyRow.id);
    app.get().focusItem("unknown");
    expect(app.get().session!.itemId).toBe(catalogFlyRow.id);
    app.get().closeSession();
    expect(app.get().session).toBeNull();
    await app.get().logSet();
    expect(app.get().history).toEqual([]);
  });
});

describe("skipping and extras", () => {
  it("a skipped exercise is passed over and can be restored", async () => {
    const app = await boot();
    app.get().toggleSkip(catalogBenchRow.id);
    expect(app.plan().nextItem!.id).toBe(catalogFlyRow.id);
    expect(app.plan().setsPlanned).toBe(3);
    app.get().toggleSkip(catalogBenchRow.id);
    expect(app.plan().nextItem!.id).toBe(catalogBenchRow.id);
  });
});
