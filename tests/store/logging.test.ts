import { DEFAULT_SETTINGS, dateKey } from "@nabd/domain";
import { selectCoach } from "@nabd/store";
import { nov } from "../support/domain-factories";
import { BENCH, benchRow, benchSet, boot, flyRow, program } from "./harness";

describe("logging sets", () => {
  it("logs one set at a time against the plan item and saves it", async () => {
    const app = await boot();
    app.get().openSession();
    expect(app.get().session).toMatchObject({
      itemId: benchRow.id,
      reps: 8,
      weight: 0,
      trigger: "manual",
    });
    app.get().setReps(10);
    app.get().setWeight(40);
    await app.get().logSet();

    expect(app.get().history).toEqual([
      expect.objectContaining({
        exId: BENCH,
        exercise: "Barbell Bench Press",
        value: 10,
        weight: 40,
        date: dateKey(nov(16)),
        trigger: "manual",
        planItemId: benchRow.id,
        setType: "working",
      }),
    ]);
    expect(app.client.appendSet).toHaveBeenCalledTimes(1);
    expect(app.plan().item(benchRow.id)!.done).toBe(1);
    expect(app.plan().setsRemaining).toBe(5);
  });

  it("stays on the exercise, rests, then moves on when it is finished", async () => {
    const app = await boot();
    await app.log(benchRow.id, 1);
    expect(app.get().session!.itemId).toBe(benchRow.id);
    expect(app.get().session!.restRemaining(app.clock.now)).toBe(90);
    await app.get().logSet();
    await app.get().logSet();
    expect(app.get().session!.itemId).toBe(flyRow.id);
  });

  it("keeps the session open on the last exercise when the day is finished", async () => {
    const app = await boot();
    await app.log(benchRow.id, 3);
    await app.log(flyRow.id, 3);
    expect(app.plan().isComplete).toBe(true);
    expect(app.get().session!.itemId).toBe(flyRow.id);
  });

  it("weights are entered in the display unit and stepped by the user's increment", async () => {
    const app = await boot({ program, settings: { ...DEFAULT_SETTINGS, weightUnit: "lb" } });
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
    const app = await boot({ program, history: [benchSet(nov(9, 10))] });
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
    await app.log(benchRow.id, 2);
    await app.get().undoSet(app.get().history[0]!.id);
    expect(app.plan().item(benchRow.id)!.done).toBe(1);
    expect(app.data.history).toHaveLength(1);
  });

  it("a failed save keeps the set on screen and tells the user", async () => {
    const app = await boot();
    vi.mocked(app.client.appendSet).mockRejectedValueOnce(new Error("disk full"));
    await app.log(benchRow.id, 1);
    expect(app.get().history).toHaveLength(1);
    expect(app.get().appNotice).toEqual({
      kind: "error",
      text: "Could not save that set: disk full",
    });
  });

  it("the form can switch exercises freely and close", async () => {
    const app = await boot();
    app.get().openSession();
    app.get().focusItem(flyRow.id);
    expect(app.get().session!.itemId).toBe(flyRow.id);
    app.get().focusItem("unknown");
    expect(app.get().session!.itemId).toBe(flyRow.id);
    app.get().closeSession();
    expect(app.get().session).toBeNull();
    await app.get().logSet();
    expect(app.get().history).toEqual([]);
  });
});

describe("skipping and extras", () => {
  it("a skipped exercise is passed over and can be restored", async () => {
    const app = await boot();
    app.get().toggleSkip(benchRow.id);
    expect(app.plan().nextItem!.id).toBe(flyRow.id);
    expect(app.plan().setsPlanned).toBe(3);
    app.get().toggleSkip(benchRow.id);
    expect(app.plan().nextItem!.id).toBe(benchRow.id);
  });
});
