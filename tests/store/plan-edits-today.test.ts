// What today keeps across plan edits: its day, what it carries, each pool's place.

import { dateKey } from "@nabd/domain";
import { carry, nov, visit } from "../support/builders";
import { CATALOG } from "../support/exercises";
import { catalogBenchRow, catalogFlyRow } from "../support/programs";
import { boot } from "./fixtures";

describe("today across plan edits", () => {
  it("editing a pool neither skips nor repeats an exercise", async () => {
    const app = await boot();
    app.get().editProgram((e) => e.removeDay("pull"));
    app.get().editProgram((e) => e.setType("cycled"));
    const slot = app.get().program.days[0]!.slots[0]!;
    app.get().editProgram((e) => e.addPoolExercise("push", slot.id, CATALOG.row));
    // The pool is Bench, Fly, Row. Bench is trained, then taken out of the pool.
    await app.finishDay();
    app.get().editProgram((e) => e.removePoolExercise("push", slot.id, CATALOG.bench));
    app.advanceTo(nov(17, 9, 30));
    expect(app.plan().dayName).toBe("Push");
    expect(app.plan().items[0]!.exercise.id).toBe(CATALOG.fly);

    // Fly is up next and is taken out before it is trained: Row follows, not Bench again.
    app.get().editProgram((e) => e.addPoolExercise("push", slot.id, CATALOG.bench));
    app.get().editProgram((e) => e.removePoolExercise("push", slot.id, CATALOG.fly));
    expect(app.plan().items[0]!.exercise.id).toBe(CATALOG.row);

    // Row is trained, so Bench is up next — and still is after Row is taken out and put back.
    await app.finishDay();
    app.advanceTo(nov(18, 9, 30));
    expect(app.data.rotationState).toEqual({ [slot.id]: CATALOG.bench });
    app.get().editProgram((e) => e.removePoolExercise("push", slot.id, CATALOG.row));
    app.get().editProgram((e) => e.addPoolExercise("push", slot.id, CATALOG.row));
    app.get().editProgram((e) => e.addPoolExercise("push", slot.id, CATALOG.fly));
    expect(app.plan().items[0]!.exercise.id).toBe(CATALOG.bench);
    // Bench itself is taken out: the exercise after it in the pool takes its turn.
    app.get().editProgram((e) => e.removePoolExercise("push", slot.id, CATALOG.bench));
    expect(app.plan().items[0]!.exercise.id).toBe(CATALOG.row);
    expect(app.data.rotationState).toEqual({ [slot.id]: CATALOG.row });
  });

  it("editing a floating plan does not change which day today is", async () => {
    const app = await boot();
    await app.log(catalogBenchRow.id, 3);
    await app.log(catalogFlyRow.id, 3);
    app.advanceTo(nov(17, 9, 30));
    expect(app.plan().dayName).toBe("Pull");

    app.get().editProgram((e) => e.addDay(null));
    app.get().editProgram((e) => e.moveDay("pull", -1));
    expect(app.plan().dayName).toBe("Pull");
    app.get().editProgram((e) => e.removeDay("push"));
    expect(app.plan().dayName).toBe("Pull");
    expect(app.data.dayState).toMatchObject({ dayId: "pull" });

    // Finishing Pull moves on to the day after it in the new order.
    await app.log(app.plan().items[0]!.id, 3);
    app.advanceTo(nov(18, 9, 30));
    expect(app.plan().dayName).toBe("New day");
  });

  describe("while a floating day is still owed its rest", () => {
    async function onTuesday() {
      const app = await boot();
      await app.log(catalogBenchRow.id, 2);
      await app.log(catalogFlyRow.id, 1);
      app.advanceTo(nov(17, 9, 30));
      expect(app.get().dayState.carried).toEqual(behind());
      return app;
    }
    /** What Monday left behind: two of bench's sets, one of fly's. */
    const behind = () =>
      visit(nov(16), {
        [catalogBenchRow.id]: carry(CATALOG.bench, { working: 2 }),
        [catalogFlyRow.id]: carry(CATALOG.fly, { working: 1 }),
      });

    it("keeps what it has behind it through edits that leave its exercises alone", async () => {
      const app = await onTuesday();
      app.get().editProgram((e) => e.moveExercise("push", catalogFlyRow.id, -1));
      app.get().editProgram((e) => e.addDay(null));
      app.get().editProgram((e) => e.moveDay("pull", -1));
      expect(app.data.dayState).toMatchObject({ carried: behind() });
      expect(app.plan().item(catalogBenchRow.id)).toMatchObject({ done: 2, remaining: 1 });
    });

    it("loses the count of an exercise that is deleted, and of every one on a deleted day", async () => {
      const app = await onTuesday();
      app.get().editProgram((e) => e.removeExercise("push", catalogFlyRow.id));
      expect(app.get().dayState.carried?.items).toEqual({
        [catalogBenchRow.id]: carry(CATALOG.bench, { working: 2 }),
      });

      app.get().editProgram((e) => e.removeDay("push"));
      expect(app.plan().dayName).toBe("Pull");
      expect(app.data.dayState).toMatchObject({ carried: null });
      expect(app.plan().setsRemaining).toBe(3);
    });

    it("counts for nothing on weekdays, and is there again after a same-day switch back", async () => {
      const app = await onTuesday();
      app.get().editProgram((e) => e.setSchedule("weekday"));
      expect(app.plan().item(catalogBenchRow.id)).toMatchObject({ done: 0, remaining: 3 });
      expect(app.get().dayState.carried).toEqual(behind());

      app.get().editProgram((e) => e.setSchedule("floating"));
      expect(app.plan().dayName).toBe("Push");
      expect(app.plan().item(catalogBenchRow.id)).toMatchObject({ done: 2, remaining: 1 });
    });

    it("is dropped when a weekday plan's next day begins", async () => {
      const app = await onTuesday();
      app.get().editProgram((e) => e.setSchedule("weekday"));
      app.advanceTo(nov(18, 9, 30));
      expect(app.get().dayState.carried).toBeNull();
    });
  });

  it("removing today's floating day moves today to the day that took its place", async () => {
    const app = await boot();
    app.get().editProgram((e) => e.removeDay("push"));
    expect(app.plan().dayName).toBe("Pull");
  });

  it("sets logged today still count after their exercise leaves the plan", async () => {
    const app = await boot();
    await app.log(catalogBenchRow.id, 2);
    app.get().editProgram((e) => e.removeExercise("push", catalogBenchRow.id));
    expect(app.plan().setsDone).toBe(2);
    expect(app.plan().items.at(-1)).toMatchObject({ isExtra: true, done: 2 });

    app.get().editProgram((e) => e.addExercise("push", CATALOG.bench));
    expect(app.plan().items.at(-1)).toMatchObject({ isExtra: false, done: 2, planned: 3 });
    expect(app.plan().items).toHaveLength(2);
  });

  it("sets logged today still count after the plan type is switched", async () => {
    const app = await boot();
    await app.log(catalogFlyRow.id, 2);
    app.get().editProgram((e) => e.setType("cycled"));
    expect(app.plan().setsDone).toBe(2);
    app.advanceTo(nov(17, 9, 30));
    expect(app.get().dayLog).toEqual([{ date: dateKey(nov(16)), planned: 3, done: 0 }]);
  });
});
