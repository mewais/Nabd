import { WEEKDAYS, WEEK_ORDER, freshDayState } from "@nabd/domain";
import type { Program } from "@nabd/domain";
import { nov } from "../support/builders";
import { CATALOG } from "../support/exercises";
import { catalogBenchRow, catalogPushPull } from "../support/programs";
import { boot, fakeBackend } from "./fixtures";

describe("the plan drives today", () => {
  it("shows the floating day's exercises", async () => {
    const app = await boot();
    expect(app.plan().dayName).toBe("Push");
    expect(app.plan().items.map((i) => i.exercise.id)).toEqual([CATALOG.bench, CATALOG.fly]);
  });

  it("plan edits reach today immediately and are saved", async () => {
    const app = await boot();
    app.get().editProgram((e) => e.addExercise("push", CATALOG.row));
    app
      .get()
      .editProgram((e) =>
        e.editPrescription("push", { kind: "exercise", id: catalogBenchRow.id }, (p) => p.addSet()),
      );
    expect(app.plan().items.map((i) => i.exercise.id)).toEqual([
      CATALOG.bench,
      CATALOG.fly,
      CATALOG.row,
    ]);
    expect(app.plan().item(catalogBenchRow.id)!.planned).toBe(4);
    expect((app.data.program as Program).days[0]!.exercises).toHaveLength(3);
  });

  it("an edit that changes nothing is not saved", async () => {
    const app = await boot();
    app.get().editProgram((e) => e.setSchedule("floating"));
    expect(app.client.saveMany).not.toHaveBeenCalled();
  });
});

describe("switching schedule keeps today's day and its sets", () => {
  /** Push on Monday, Pull on Wednesday. */
  const weekdays: Program = {
    ...catalogPushPull,
    schedule: "weekday",
    days: [
      { ...catalogPushPull.days[0]!, weekday: 1 },
      { ...catalogPushPull.days[1]!, weekday: 3 },
    ],
  };

  it("weekdays → floating on a training day stays on that day", async () => {
    // A Wednesday: Pull day. A floating position left from before must not come back.
    const stored = { program: weekdays, dayState: { ...freshDayState(nov(18)), dayId: "push" } };
    const app = await boot(stored, fakeBackend(stored), nov(18, 10));
    await app.log(app.plan().items[0]!.id, 1);
    app.get().editProgram((e) => e.setSchedule("floating"));

    expect(app.plan().dayName).toBe("Pull");
    expect(app.plan().items.map((i) => [i.exercise.id, i.done, i.isExtra])).toEqual([
      [CATALOG.row, 1, false],
    ]);
    expect(app.data.dayState).toMatchObject({ dayId: "pull" });
  });

  it("weekdays → floating on a rest day starts from the first day of the week", async () => {
    const app = await boot({ program: weekdays }, fakeBackend({ program: weekdays }), nov(17, 10));
    expect(app.plan().dayName).toBeNull();
    app.get().editProgram((e) => e.setSchedule("floating"));
    expect(app.get().dayState.dayId).toBeNull();
    expect(app.plan().dayName).toBe("Push");
  });

  it("floating → weekdays pins the day the plan is on to today", async () => {
    // A Wednesday, on the plan's second day.
    const stored = {
      program: catalogPushPull,
      dayState: { ...freshDayState(nov(18)), dayId: "pull" },
    };
    const app = await boot(stored, fakeBackend(stored), nov(18, 10));
    await app.log(app.plan().items[0]!.id, 1);
    app.get().editProgram((e) => e.setSchedule("weekday"));

    expect(app.get().program.days.map((d) => [d.id, d.weekday])).toEqual([
      ["push", 4],
      ["pull", 3],
    ]);
    expect(app.plan().dayName).toBe("Pull");
    expect(app.plan().items.map((i) => [i.exercise.id, i.done, i.isExtra])).toEqual([
      [CATALOG.row, 1, false],
    ]);
    expect(app.get().dayState.dayId).toBeNull();
  });
});

describe("the day open in the planner", () => {
  it("is today's day when the planner is opened, whichever was open before", async () => {
    const stored = {
      program: catalogPushPull,
      dayState: { ...freshDayState(nov(16)), dayId: "pull" },
    };
    const app = await boot(stored);
    app.get().showScreen("planner");
    expect(app.get().plannerDayId).toBe("pull");
    app.get().selectPlannerDay("push");
    app.get().showScreen("today");
    app.get().showScreen("planner");
    expect(app.get().plannerDayId).toBe("pull");
  });

  it("is the plan's first day on a rest day, and none in an empty plan", async () => {
    const resting: Program = {
      ...catalogPushPull,
      schedule: "weekday",
      days: catalogPushPull.days.map((day, index) => ({
        ...day,
        weekday: WEEK_ORDER[index + 1] ?? null,
      })),
    };
    const app = await boot({ program: resting });
    app.get().showScreen("planner");
    expect(app.get().plannerDayId).toBe("push");

    // The first day of a week is its Monday-first earliest, wherever it is stored: here
    // Push is on Sunday and Pull on Tuesday, and today (Monday) is a rest day.
    const sundayFirst: Program = {
      ...catalogPushPull,
      schedule: "weekday",
      days: catalogPushPull.days.map((day, index) => ({
        ...day,
        weekday: WEEKDAYS[index * 2] ?? null,
      })),
    };
    const stored = await boot({ program: sundayFirst });
    expect(stored.get().plannerDayId).toBe("pull");

    const empty = await boot({});
    empty.get().showScreen("planner");
    expect(empty.get().plannerDayId).toBeNull();
  });

  it("stays on the day that is moved, opens a day that is added, and the neighbour of one deleted", async () => {
    const app = await boot();
    app.get().showScreen("planner");
    app.get().editProgram((e) => e.moveDay("push", 1));
    expect(app.get().plannerDayId).toBe("push");

    app.get().editProgram((e) => e.addDay(null));
    const added = app.get().program.days.at(-1)!.id;
    expect(app.get().plannerDayId).toBe(added);

    app.get().editProgram((e) => e.removeDay(added));
    expect(app.get().plannerDayId).toBe("push");
    app.get().editProgram((e) => e.removeDay("push"));
    expect(app.get().plannerDayId).toBe("pull");
  });
});

describe("destructive actions wait for a yes", () => {
  it("deleting a day does nothing until it is confirmed, and nothing at all if it is not", async () => {
    const app = await boot();
    app.get().ask({ kind: "deleteDay", dayId: "pull" });
    expect(app.get().confirmation).toEqual({ kind: "deleteDay", dayId: "pull" });
    expect(app.get().program.days).toHaveLength(2);

    await app.get().answer(false);
    expect(app.get().confirmation).toBeNull();
    expect(app.get().program.days).toHaveLength(2);

    app.get().ask({ kind: "deleteDay", dayId: "pull" });
    await app.get().answer(true);
    expect(app.get().confirmation).toBeNull();
    expect(app.get().program.days.map((d) => d.id)).toEqual(["push"]);
  });

  it("the same goes for deleting a custom exercise and for importing over what is stored", async () => {
    const app = await boot();
    app.get().startDraft();
    app.get().patchDraft({ name: "Desk Dips", primary: ["triceps"] });
    app.get().saveDraft();
    const [custom] = app.get().customExercises;
    app.get().ask({ kind: "deleteExercise", exId: custom!.id });
    expect(app.get().customExercises).toHaveLength(1);
    await app.get().answer(true);
    expect(app.get().customExercises).toEqual([]);

    const json = JSON.stringify({
      app: "Nabd",
      version: 2,
      program: { ...catalogPushPull, name: "New" },
    });
    app.get().importData(json);
    expect(app.get().confirmation).toMatchObject({ kind: "import" });
    expect(app.client.importData).not.toHaveBeenCalled();
    await app.get().answer(false);
    expect(app.client.importData).not.toHaveBeenCalled();
    expect(app.get().program.name).toBe(catalogPushPull.name);

    app.get().importData(json);
    await app.get().answer(true);
    expect(app.get().program.name).toBe("New");
  });

  it("a file that is no export is refused outright: there is nothing to confirm", async () => {
    const app = await boot();
    app.get().importData("{not json");
    expect(app.get().confirmation).toBeNull();
    expect(app.get().dataNotice).toMatchObject({ kind: "error" });
  });

  it("an answer with nothing asked does nothing", async () => {
    const app = await boot();
    await app.get().answer(true);
    expect(app.get().program).toEqual(catalogPushPull);
  });
});
