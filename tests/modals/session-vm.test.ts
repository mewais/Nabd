/**
 * @nabd/modals — buildSessionVM: what the set logger shows for a draft
 * session against today's plan.
 */

import type { LoggedSet } from "@nabd/domain";
import { buildSessionVM } from "@nabd/modals";
import {
  buildWorld,
  did,
  lastWeek,
  mondayProgram,
  planRow,
  pushDay,
} from "../support/plan-fixtures";
import { nov, working } from "../support/domain-factories";
import { openSession, sessionVM } from "./fixtures";

const warmedUp = () => [...lastWeek(), did("p-bench", "bench", 10, 40, { setType: "warmup" })];

describe("buildSessionVM", () => {
  it("is null when the session's exercise is no longer in today's plan", () => {
    const { session, coach, now } = openSession({ program: pushDay() }, "p-bench");
    const withoutBench = buildWorld({
      program: mondayProgram([planRow("p-row", "row", [working(8, 12)])]),
    }).plan;

    expect(
      buildSessionVM({ session, plan: withoutBench, coach, unit: "kg", now, unsaved: [] }),
    ).toBeNull();
  });

  it("starts on the warm-up: its target, no advice, the form pre-filled with the last warm-up", () => {
    const { form } = sessionVM({ program: pushDay(), history: lastWeek() }, "p-bench");

    expect(form.exercise).toBe("Bench Press");
    expect(form.setLine).toBe("Set 1 of 3 · Warm-up · 10 reps");
    expect(form.notes).toBe("Pause at the chest");
    expect(form.muscleNames).toEqual(["Chest", "Triceps", "Front Delts"]);
    expect(form.advice).toBeNull();
    // Last week's warm-up, not last week's working set.
    expect(form).toMatchObject({
      repsLabel: "Reps",
      reps: 10,
      weight: 40,
      weightLabel: "Weight (kg)",
    });
    expect(form.logged).toEqual([]);
    expect(form.restLabel).toBeNull();
  });

  it("on a working set, carries the coach's advice", () => {
    const { form } = sessionVM({ program: pushDay(), history: warmedUp() }, "p-bench");

    expect(form.setLine).toBe("Set 2 of 3 · Working set · 8–12 reps · RPE 8");
    expect(form.advice).toEqual({
      primary: "9 × 60 kg",
      alternative: "8 × 62.5 kg",
      reason: "Inside your range — beat last time.",
      basis: "Last time: 8 × 60 kg",
    });
  });

  it("shows loads in pounds for lb users (weights stay stored in kg)", () => {
    const { form } = sessionVM({ program: pushDay(), history: warmedUp() }, "p-bench", {
      unit: "lb",
    });

    expect(form.weightLabel).toBe("Weight (lb)");
    expect(form.weight).toBe(132.28);
    expect(form.advice?.primary).toBe("9 × 132.28 lb");
    expect(form.logged.map((s) => s.text)).toEqual(["10 × 88.18 lb"]);
  });

  it("lists this exercise's sets from today, oldest first, numbered, with ids to undo them", () => {
    const first = did("p-bench", "bench", 10, 40, { setType: "warmup" });
    const second = did("p-bench", "bench", 9, 60);
    const other = did("p-row", "row", 12, 50);
    const vm = sessionVM(
      { program: pushDay(), history: [...lastWeek(), first, other, second] },
      "p-bench",
    );

    expect(vm.form.logged).toEqual([
      {
        id: first.id,
        label: "Set 1",
        text: "10 × 40 kg",
        deleteLabel: "Delete set 1",
        unsaved: false,
      },
      {
        id: second.id,
        label: "Set 2",
        text: "9 × 60 kg",
        deleteLabel: "Delete set 2",
        unsaved: false,
      },
    ]);
  });

  it("marks the sets that are not saved yet", () => {
    const first = did("p-row", "row", 12, 50);
    const second = did("p-row", "row", 11, 50);
    const vm = sessionVM({ program: pushDay(), history: [first, second] }, "p-row", {
      unsaved: [second.id],
    });
    expect(vm.form.logged.map((set) => set.unsaved)).toEqual([false, true]);
  });

  it("shows a load to the quarter kilo, exactly as it was entered", () => {
    const history = [did("p-row", "row", 12, 21.25)];
    const { form } = sessionVM({ program: pushDay(), history }, "p-row");
    expect(form.weight).toBe(21.25);
    expect(form.logged.map((s) => s.text)).toEqual(["12 × 21.25 kg"]);
  });

  it("words an unloaded set of a bodyweight exercise as plain reps", () => {
    const program = mondayProgram([planRow("p-dip", "dip", [working(8, 12), working(8, 12)])]);
    const { form } = sessionVM({ program, history: [did("p-dip", "dip", 12, 0)] }, "p-dip");
    expect(form.logged.map((s) => s.text)).toEqual(["12 reps"]);
  });

  it("the footer counts the sets logged today across all exercises", () => {
    const footer = (history: LoggedSet[]) =>
      sessionVM({ program: pushDay(), history }, "p-bench").footer;

    expect(footer(lastWeek())).toBe("No sets logged yet today");
    expect(footer([did("p-row", "row", 12, 50)])).toBe("1 set logged today");
    expect(footer([did("p-row", "row", 12, 50), did("p-bench", "bench", 9, 60)])).toBe(
      "2 sets logged today",
    );
  });

  it("once the prescription is done, further sets are extras with no target", () => {
    const history = [did("p-row", "row", 12, 50), did("p-row", "row", 11, 50)];
    const { form } = sessionVM({ program: pushDay(), history }, "p-row");

    expect(form.setLine).toBe("All 2 sets done — extra set");
  });

  it("an unplanned exercise just counts sets", () => {
    const input = {
      program: pushDay(),
      extras: [{ id: "x-curl", exId: "curl" }],
      history: [did("x-curl", "curl", 12, 10), did("x-curl", "curl", 10, 10)],
    };
    const vm = sessionVM(input, "x-curl");

    expect(vm.form.exercise).toBe("Dumbbell Curl");
    expect(vm.form.setLine).toBe("Set 3");
    expect(vm.form.notes).toBe("");
    expect(vm.list.find((r) => r.itemId === "x-curl")).toMatchObject({
      progress: "2",
      active: true,
    });
  });

  it("the exercise list mirrors the plan: progress, completion, skips, the active row", () => {
    const vm = sessionVM(
      {
        program: pushDay(),
        skipped: ["p-plank"],
        history: [
          did("p-bench", "bench", 10, 40, { setType: "warmup" }),
          did("p-row", "row", 12, 50),
          did("p-row", "row", 12, 50),
        ],
      },
      "p-bench",
    );

    expect(vm.list).toEqual([
      {
        itemId: "p-bench",
        exercise: "Bench Press",
        detail: "Chest, Triceps, Front Delts",
        progress: "1/3",
        complete: false,
        skipped: false,
        active: true,
      },
      {
        itemId: "p-row",
        exercise: "Barbell Row",
        detail: "Lats, Rhomboids, Biceps",
        progress: "2/2",
        complete: true,
        skipped: false,
        active: false,
      },
      {
        itemId: "p-plank",
        exercise: "Plank",
        detail: "Skipped today",
        progress: "0/1",
        complete: false,
        skipped: true,
        active: false,
      },
    ]);
  });

  it("a timed, unweighted exercise asks for seconds and no load", () => {
    const history = [...lastWeek(), did("p-plank", "plank", 35, null)];
    const { form } = sessionVM({ program: pushDay(), history }, "p-plank");

    expect(form.repsLabel).toBe("Sec");
    expect(form.reps).toBe(35);
    expect(form.weight).toBeNull();
    expect(form.logged.map((s) => s.text)).toEqual(["35 s"]);
  });

  it("names the load for what it is on assisted and weighted bodyweight exercises", () => {
    const program = mondayProgram([
      planRow("p-pullup", "pullup", [working(6, 10), working(6, 10)]),
      planRow("p-dip", "dip", [working(6, 10), working(6, 10)]),
    ]);
    const history = [did("p-pullup", "pullup", 8, 20), did("p-dip", "dip", 8, 10)];

    const pullup = sessionVM({ program, history }, "p-pullup").form;
    expect(pullup.weightLabel).toBe("Assistance (kg)");
    expect(pullup.weight).toBe(20);
    expect(pullup.logged.map((s) => s.text)).toEqual(["8 − 20 kg assist"]);

    const dip = sessionVM({ program, history }, "p-dip", { unit: "lb" }).form;
    expect(dip.weightLabel).toBe("Added weight (lb)");
    expect(dip.weight).toBe(22.05);
    expect(dip.logged.map((s) => s.text)).toEqual(["8 + 22.05 lb"]);
  });

  it("counts down the rest after a set, then drops the label", () => {
    const { session, plan, coach } = openSession({ program: pushDay() }, "p-bench");
    const loggedAt = nov(16, 10, 30);
    const resting = session.resting(loggedAt, 90);
    const at = (now: Date) =>
      buildSessionVM({ session: resting, plan, coach, unit: "kg", now, unsaved: [] })?.form
        .restLabel;
    const secondsLater = (s: number) => new Date(loggedAt.getTime() + s * 1000);

    expect(at(loggedAt)).toBe("Rest 1:30");
    expect(at(secondsLater(10))).toBe("Rest 1:20");
    expect(at(secondsLater(85))).toBe("Rest 0:05");
    expect(at(secondsLater(90))).toBeNull();
    expect(at(secondsLater(300))).toBeNull();
  });
});
