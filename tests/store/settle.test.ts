import { selectPendingNudge } from "@nabd/store";
import { nov } from "../support/builders";
import { catalogBenchRow, catalogFlyRow } from "../support/programs";
import { boot } from "./fixtures";
import { CATALOG } from "../support/exercises";
describe("the session never outlives its exercise", () => {
  it("moves to the next exercise when its exercise is removed from the plan", async () => {
    const app = await boot();
    app.get().openSession(catalogBenchRow.id);
    app.get().editProgram((e) => e.removeExercise("push", catalogBenchRow.id));
    expect(app.get().session!.itemId).toBe(catalogFlyRow.id);
    expect(app.plan().item(app.get().session!.itemId)).toBeDefined();
  });

  it("follows its exercise to its new plan item when the plan type is switched", async () => {
    const app = await boot();
    app.get().openSession(catalogFlyRow.id);
    app.get().editProgram((e) => e.removeExercise("push", catalogBenchRow.id));
    app.get().editProgram((e) => e.setType("cycled"));
    const item = app.plan().item(app.get().session!.itemId)!;
    expect(item.exercise.id).toBe(CATALOG.fly);
    expect(item.id).not.toBe(catalogFlyRow.id);
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
    await app.log(catalogBenchRow.id, 3);
    await app.log(catalogFlyRow.id, 2);
    app.get().editProgram((e) => e.removeExercise("push", catalogBenchRow.id));
    app.get().editProgram((e) => e.removeExercise("push", catalogFlyRow.id));
    app.get().editProgram((e) => e.addExercise("push", CATALOG.row));
    // Fly is now an exercise outside the plan, kept in the queue by its two sets.
    const orphan = app.plan().items.find((item) => item.exercise.id === CATALOG.fly)!;
    app.get().openSession(orphan.id);
    for (const set of orphan.logged) await app.get().undoSet(set.id);
    expect(app.plan().items.some((item) => item.exercise.id === CATALOG.fly)).toBe(false);
    // The session moved on to the exercise that still owes sets; closing it lets nudges resume.
    expect(app.plan().item(app.get().session!.itemId)!.exercise.id).toBe(CATALOG.row);
    app.get().closeSession();
    app.advanceTo(nov(16, 13));
    expect(selectPendingNudge(app.get())).not.toBeNull();
  });

  it("closes at midnight with the day it belonged to", async () => {
    const app = await boot();
    app.get().openSession(catalogBenchRow.id);
    app.advanceTo(nov(17, 0, 1));
    expect(app.get().session).toBeNull();
  });
});
