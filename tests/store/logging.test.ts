import { DEFAULT_SETTINGS, dateKey } from "@nabd/domain";
import { selectCoach, selectPendingNudge } from "@nabd/store";
import { nov, threeSets, warmup } from "../support/domain-factories";
import { BENCH, FLY, ROW, benchRow, benchSet, boot, flyRow, program } from "./harness";

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

  describe("a set that could not be saved", () => {
    const failOnce = async () => {
      const app = await boot();
      vi.mocked(app.client.appendSet).mockRejectedValueOnce(new Error("disk full"));
      await app.log(benchRow.id, 1);
      return app;
    };

    it("stays on screen, is marked as waiting, and the user is told it will be retried", async () => {
      const app = await failOnce();
      const [set] = app.get().history;
      expect(app.get().unsavedSets).toEqual([set!.id]);
      expect(app.data.history).toEqual([]);
      expect(app.get().appNotice).toEqual({
        kind: "error",
        text:
          "Could not save that set: disk full. It is kept, marked as not saved yet, " +
          "and will be saved as soon as that works again.",
      });
    });

    it("is saved on the next beat of the clock", async () => {
      const app = await failOnce();
      app.advanceTo(nov(16, 10, 1));
      await vi.waitFor(() => expect(app.get().unsavedSets).toEqual([]));
      expect(app.data.history).toEqual(app.get().history);
      expect(app.get().appNotice).toEqual({
        kind: "info",
        text: "The sets that were waiting are saved now.",
      });
    });

    it("is saved after the next backend call that works", async () => {
      const app = await failOnce();
      app.get().togglePause();
      await vi.waitFor(() => expect(app.data.history).toEqual(app.get().history));
      expect(app.get().unsavedSets).toEqual([]);
    });

    it("keeps waiting, quietly, for as long as saving keeps failing", async () => {
      const app = await failOnce();
      vi.mocked(app.client.appendSet).mockRejectedValue(new Error("disk full"));
      app.get().dismissNotice();
      app.advanceTo(nov(16, 10, 1));
      app.advanceTo(nov(16, 10, 2));
      await Promise.resolve();
      expect(app.get().unsavedSets).toHaveLength(1);
      expect(app.get().appNotice).toBeNull();
    });

    it("is saved before an export, which otherwise says what it is missing", async () => {
      const app = await failOnce();
      await app.get().exportData();
      expect(app.data.history).toEqual(app.get().history);
      expect(app.get().notice!.text).toBe("Exported to memory (nothing is written)");

      const stuck = await failOnce();
      vi.mocked(stuck.client.appendSet).mockRejectedValue(new Error("disk full"));
      await stuck.get().exportData();
      expect(stuck.get().notice!.text).toBe(
        "Exported to memory (nothing is written) — without 1 set not saved yet",
      );
    });

    it("is saved before quitting", async () => {
      const app = await failOnce();
      app.get().quit();
      await vi.waitFor(() => expect(app.client.quit).toHaveBeenCalledTimes(1));
      expect(app.data.history).toEqual(app.get().history);
    });

    it("undone before it was saved, it is simply dropped and never reaches the backend", async () => {
      const app = await failOnce();
      await app.get().undoSet(app.get().history[0]!.id);
      expect(app.get().history).toEqual([]);
      expect(app.client.deleteSet).not.toHaveBeenCalled();
      app.advanceTo(nov(16, 10, 1));
      await vi.waitFor(() => expect(app.get().unsavedSets).toEqual([]));
      expect(app.data.history).toEqual([]);
    });
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
      const row = { ...benchRow, sets: [warmup(12), ...threeSets()] };
      const plan = { ...program, days: [{ ...program.days[0]!, exercises: [row, flyRow] }] };
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
      expect(app.get().session).toMatchObject({ itemId: benchRow.id, reps: 10, weight: 35 });
    });

    it("between two sets of the same kind the form keeps what was just done", async () => {
      const app = await warmedUp();
      await app.get().logSet();
      app.get().setReps(11);
      app.get().setWeight(37.5);
      await app.get().logSet();
      expect(app.get().session).toMatchObject({ itemId: benchRow.id, reps: 11, weight: 37.5 });
    });

    it("an extra set of a finished exercise keeps the form on that exercise", async () => {
      const app = await boot();
      await app.log(benchRow.id, 3);
      expect(app.get().session!.itemId).toBe(flyRow.id);
      await app.log(benchRow.id, 1);
      expect(app.plan().item(benchRow.id)!.done).toBe(4);
      expect(app.get().session!.itemId).toBe(benchRow.id);
    });
  });

  describe("the session never outlives its exercise", () => {
    it("moves to the next exercise when its exercise is removed from the plan", async () => {
      const app = await boot();
      app.get().openSession(benchRow.id);
      app.get().editProgram((e) => e.removeExercise("push", benchRow.id));
      expect(app.get().session!.itemId).toBe(flyRow.id);
      expect(app.plan().item(app.get().session!.itemId)).toBeDefined();
    });

    it("follows its exercise to its new plan item when the plan type is switched", async () => {
      const app = await boot();
      app.get().openSession(flyRow.id);
      app.get().editProgram((e) => e.removeExercise("push", benchRow.id));
      app.get().editProgram((e) => e.setType("cycled"));
      const item = app.plan().item(app.get().session!.itemId)!;
      expect(item.exercise.id).toBe(FLY);
      expect(item.id).not.toBe(flyRow.id);
    });

    it("closes when a deleted custom exercise leaves nothing to log", async () => {
      const app = await boot({});
      app.get().startDraft();
      app.get().patchDraft({ name: "Desk Dips", primary: ["triceps"] });
      app.get().saveDraft();
      const [custom] = app.get().customExercises;
      app.get().openLibrary({ kind: "extra" });
      app.get().pickExercise(custom!.id);
      expect(app.get().session).not.toBeNull();

      app.get().deleteCustomExercise(custom!.id);
      expect(app.get().session).toBeNull();
    });

    it("closes when the last set of an exercise that left the plan is undone, and nudges go on", async () => {
      const app = await boot();
      await app.log(benchRow.id, 3);
      await app.log(flyRow.id, 2);
      app.get().editProgram((e) => e.removeExercise("push", benchRow.id));
      app.get().editProgram((e) => e.removeExercise("push", flyRow.id));
      app.get().editProgram((e) => e.addExercise("push", ROW));
      // Fly is now an exercise outside the plan, kept in the queue by its two sets.
      const orphan = app.plan().items.find((item) => item.exercise.id === FLY)!;
      app.get().openSession(orphan.id);
      for (const set of orphan.logged) await app.get().undoSet(set.id);
      expect(app.plan().items.some((item) => item.exercise.id === FLY)).toBe(false);
      // The session moved on to the exercise that still owes sets; closing it lets nudges resume.
      expect(app.plan().item(app.get().session!.itemId)!.exercise.id).toBe(ROW);
      app.get().closeSession();
      app.advanceTo(nov(16, 13));
      expect(selectPendingNudge(app.get())).not.toBeNull();
    });

    it("closes at midnight with the day it belonged to", async () => {
      const app = await boot();
      app.get().openSession(benchRow.id);
      app.advanceTo(nov(17, 0, 1));
      expect(app.get().session).toBeNull();
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
