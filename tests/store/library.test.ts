import { BENCH, FLY, ROW, boot } from "./harness";

describe("the exercise library", () => {
  it("custom exercises can be created from a draft, used, and deleted everywhere", async () => {
    const app = await boot();
    app.get().openLibrary({ kind: "exercise", dayId: "push" });
    app.get().startDraft(BENCH);
    expect(app.get().library.draft).toMatchObject({
      name: "Barbell Bench Press (copy)",
      primary: ["chest"],
    });
    app.get().patchDraft({ name: "  Floor Press ", secondary: ["chest", "triceps"] });
    app.get().saveDraft();

    const [custom] = app.get().customExercises;
    expect(custom).toMatchObject({
      name: "Floor Press",
      group: "Chest",
      custom: true,
      secondary: ["triceps"],
    });
    expect(app.get().library.draft).toBeNull();

    app.get().pickExercise(custom!.id);
    expect(app.get().library.target).toBeNull();
    expect(app.plan().items.at(-1)!.exercise.name).toBe("Floor Press");

    app.get().deleteCustomExercise(custom!.id);
    expect(app.get().customExercises).toEqual([]);
    expect(app.plan().items.map((i) => i.exercise.id)).toEqual([BENCH, FLY]);
    expect(app.data.customExercises).toEqual([]);
  });

  it("a draft without a name or primary muscle is not saved", async () => {
    const app = await boot();
    app.get().startDraft();
    app.get().patchDraft({ name: "Nameless muscle" });
    app.get().saveDraft();
    app.get().patchDraft({ name: " ", primary: ["chest"] });
    app.get().saveDraft();
    expect(app.get().customExercises).toEqual([]);
  });

  it("picking into a cycled pool keeps the library open for more", async () => {
    const app = await boot();
    app.get().editProgram((e) => e.setType("cycled"));
    const slot = app.get().program.days[0]!.slots[0]!;
    app.get().openLibrary({ kind: "pool", dayId: "push", slotId: slot.id, muscle: slot.muscle });
    app.get().pickExercise(ROW);
    expect(app.get().program.days[0]!.slots[0]!.pool).toContain(ROW);
    expect(app.get().library.target).not.toBeNull();
  });

  it("an exercise outside the plan can be logged today; untouched, it can be removed", async () => {
    const app = await boot();
    app.get().openLibrary({ kind: "extra" });
    app.get().pickExercise(ROW);
    const extra = app.plan().items.at(-1)!;
    expect(extra.isExtra).toBe(true);
    expect(app.get().session!.itemId).toBe(extra.id);
    expect(app.get().library.target).toBeNull();

    app.get().toggleSkip(extra.id);
    expect(app.plan().items).toHaveLength(2);

    app.get().pickExercise(ROW); // library is closed: nothing happens
    expect(app.plan().items).toHaveLength(2);
  });
});
