/** @nabd/today — buildTodayVM, the queue: today's exercises and what can be done with each. */

import { carry, nov, visit, warmup, working } from "../support/builders";
import { asFloating, did, mondayProgram, planRow } from "../support/programs";
import { todayVM } from "./fixtures";

describe("buildTodayVM · queue", () => {
  const program = () =>
    mondayProgram(
      [
        planRow("p-bench", "bench", [working(8, 12), working(8, 12)]),
        planRow("p-pushup", "pushup", [working(10, 15), working(10, 15)], { supersetId: "ss1" }),
        planRow("p-dip", "dip", [working(6, 10), working(6, 10)], { supersetId: "ss1" }),
        planRow("p-row", "row", [working(8, 12)]),
        planRow("p-plank", "plank", [working(30)], { repMode: "time" }),
      ],
      "Upper body",
    );
  const queue = () =>
    todayVM({
      program: program(),
      skipped: ["p-row"],
      extras: [
        { id: "x-curl", exId: "curl" },
        { id: "x-pullup", exId: "pullup" },
      ],
      history: [
        did("p-bench", "bench", 10, 60),
        did("p-bench", "bench", 9, 60),
        did("p-pushup", "pushup", 12, null),
        did("x-pullup", "pullup", 8, 20),
        did("x-pullup", "pullup", 7, 20),
      ],
    });
  const row = (id: string) => {
    const found = queue().queue.rows.find((r) => r.id === id);
    if (!found) throw new Error(`no queue row "${id}"`);
    return found;
  };

  it("lists the day's exercises in plan order, extras last, under the day's name", () => {
    const vm = queue();
    expect(vm.queue.dayName).toBe("Upper body");
    expect(vm.queue.rows.map((r) => r.exercise)).toEqual([
      "Bench Press",
      "Push-Up",
      "Weighted Dip",
      "Barbell Row",
      "Plank",
      "Dumbbell Curl",
      "Assisted Pull-Up",
    ]);
  });

  it("describes each row by its group and the muscles it works", () => {
    expect(row("p-bench").sub).toBe("Chest · Chest, Triceps, Front Delts");
    expect(row("p-plank").sub).toBe("Abs · Abs, Obliques");
  });

  it("a finished exercise is done and can no longer be skipped", () => {
    expect(row("p-bench")).toMatchObject({ state: "done", badge: "2/2 sets", skip: null });
  });

  it("the first exercise still owing sets is next; later ones are pending", () => {
    expect(row("p-pushup")).toMatchObject({
      state: "next",
      badge: "1/2 sets",
      skip: { label: "Skip" },
    });
    expect(row("p-dip")).toMatchObject({
      state: "pending",
      badge: "0/2 sets",
      skip: { label: "Skip" },
    });
    expect(row("p-plank")).toMatchObject({ state: "pending", badge: "0/1 set" });
    expect(queue().queue.rows.filter((r) => r.state === "next")).toHaveLength(1);
  });

  it("marks superset partners A1/A2 and every other row with its place in the day", () => {
    expect(row("p-bench").marker).toBe("01");
    expect(row("p-pushup").marker).toBe("A1");
    expect(row("p-dip").marker).toBe("A2");
    expect(row("p-row").marker).toBe("04");
    expect(row("x-curl").marker).toBe("06");
  });

  it("anything not skipped can be started; a finished exercise takes more sets", () => {
    expect(row("p-pushup").start?.label).toBe("Start");
    expect(row("x-curl").start?.label).toBe("Start");
    expect(row("p-bench").start?.label).toBe("More");
    expect(row("p-row").start).toBeNull();
  });

  it("names each button for what it does to which exercise", () => {
    expect(row("p-pushup").start?.name).toBe("Start Push-Up");
    expect(row("p-pushup").skip?.name).toBe("Skip Push-Up");
    expect(row("p-bench").start?.name).toBe("More Bench Press");
    expect(row("p-row").skip?.name).toBe("Restore Barbell Row");
    expect(row("x-curl").skip?.name).toBe("Remove Dumbbell Curl");
  });

  it("a skipped exercise says so and offers to restore it", () => {
    expect(row("p-row")).toMatchObject({
      state: "skipped",
      badge: "Skipped",
      skip: { label: "Restore" },
    });
  });

  it("an untouched extra shows a bare set count and can be removed", () => {
    expect(row("x-curl")).toMatchObject({
      state: "pending",
      badge: "0 sets",
      skip: { label: "Remove" },
    });
  });

  it("an extra with logged sets is done and can no longer be removed", () => {
    expect(row("x-pullup")).toMatchObject({ state: "done", badge: "2 sets", skip: null });
  });

  it("counts a set only against a prescribed set of its kind, and shows sets beyond a whole one", () => {
    const vm = todayVM({
      program: mondayProgram([
        planRow("p-bench", "bench", [warmup(12), working(8, 12)]),
        planRow("p-dip", "dip", [working(6, 10)]),
      ]),
      history: [
        did("p-bench", "bench", 10, 60),
        did("p-bench", "bench", 9, 60),
        did("p-dip", "dip", 8, null),
        did("p-dip", "dip", 7, null),
      ],
    });
    const rowOf = (id: string) => vm.queue.rows.find((r) => r.id === id);
    // Two working sets against a warm-up and one working set: the warm-up is still owed.
    expect(rowOf("p-bench")).toMatchObject({ state: "next", badge: "1/2 sets" });
    expect(rowOf("p-dip")).toMatchObject({ state: "done", badge: "2/1 set" });
  });

  describe("on a floating day that came back with only the rest", () => {
    // Bench was done on an earlier day, and one of the push-up's two sets.
    const comeback = () =>
      todayVM({
        program: asFloating(program()),
        carried: visit(nov(13), {
          "p-bench": carry("bench", { working: 2 }),
          "p-pushup": carry("pushup", { working: 1 }),
        }),
        history: [did("p-pushup", "pushup", 12, null)],
      });
    const comebackRow = (id: string) => comeback().queue.rows.find((r) => r.id === id);

    it("shows what earlier days did as done, and the next exercise as the one still owing", () => {
      expect(comebackRow("p-bench")).toMatchObject({ state: "done", badge: "2/2 sets" });
      expect(comebackRow("p-pushup")).toMatchObject({ state: "done", badge: "2/2 sets" });
      expect(comeback().queue.rows.find((r) => r.state === "next")?.id).toBe("p-dip");
    });

    it("counts a set done yesterday toward the set tally, so the exercise still owes the rest", () => {
      const carried = visit(nov(13), { "p-dip": carry("dip", { working: 1 }) });
      const rest = todayVM({ program: asFloating(program()), carried });
      expect(rest.queue.rows.find((r) => r.id === "p-dip")).toMatchObject({
        state: "pending",
        badge: "1/2 sets",
      });
    });
  });
});
