/**
 * @nabd/modals — buildSessionVM: what the set logger shows for a draft
 * session against today's plan.
 */

import type { LoggedSet } from "@nabd/domain";
import { buildSessionVM } from "@nabd/modals";
import { carry, nov, visit, working } from "../support/builders";
import { asFloating, did, lastWeek, mondayProgram, planRow, pushDay } from "../support/programs";
import { buildWorld } from "../support/world";
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

    expect(form.set.exercise).toBe("Bench Press");
    expect(form.setLine).toBe("Set 1 of 3 · Warm-up · 10 reps");
    expect(form.set.notes).toBe("Pause at the chest");
    expect(form.set.muscleNames).toEqual(["Chest", "Triceps", "Front Delts"]);
    expect(form.set.advice).toBeNull();
    // Last week's warm-up, not last week's working set.
    expect(form).toMatchObject({
      repsLabel: "Reps",
      reps: 10,
      weight: 40,
      weightLabel: "Weight (kg)",
      repsDecimals: 0,
      weightDecimals: 2,
    });
    expect(form.logged).toEqual([]);
    expect(form.restLabel).toBeNull();
  });

  it("on a working set, carries the coach's advice", () => {
    const { form } = sessionVM({ program: pushDay(), history: warmedUp() }, "p-bench");

    expect(form.setLine).toBe("Set 2 of 3 · Working set · 8–12 reps · RPE 8");
    expect(form.set.advice).toEqual({
      primary: "8 × 57.5 kg",
      alternative: "9 × 60 kg",
      reason: "RPE 8 ≈ 2 reps in reserve.",
      basis: "Last time: 8 × 60 kg",
    });
  });

  it("shows loads in pounds for lb users (weights stay stored in kg)", () => {
    const { form } = sessionVM({ program: pushDay(), history: warmedUp() }, "p-bench", {
      unit: "lb",
    });

    expect(form.weightLabel).toBe("Weight (lb)");
    expect(form.weight).toBe(132.28);
    expect(form.set.advice?.primary).toBe("8 × 126.8 lb");
    expect(form.logged.map((s) => s.text)).toEqual(["10 × 88.2 lb"]);
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

  it("on a day that came back with only the rest, counts the sets done on earlier days", () => {
    // The warm-up and the first working set were done earlier: the last working set is next.
    const carried = visit(nov(13), { "p-bench": carry("bench", { warmup: 1, working: 1 }) });
    const program = asFloating(pushDay());
    const vm = sessionVM({ program, history: lastWeek(), carried }, "p-bench");

    expect(vm.form.setLine).toBe("Set 3 of 3 · Working set · 8–12 reps · RPE 8");
    expect(vm.form.logged).toEqual([]);
    expect(vm.list.find((row) => row.itemId === "p-bench")).toMatchObject({
      progress: "2/3",
      complete: false,
    });
    // Compared against last week's second working set, the 7.
    expect(vm.form.set.advice?.basis).toBe("Last time: 7 × 60 kg");
    expect(vm.footer).toBe("No sets logged yet today");
    expect(vm.subtitle).toBe("Continuing Friday's Push — what was done then counts.");
  });

  it("says what the logger is for on a day that began today", () => {
    expect(sessionVM({ program: pushDay() }, "p-bench").subtitle).toBe(
      "One set, or as many as you have time for — switch exercises freely.",
    );
  });

  it("names a visit begun more than a week ago by its date", () => {
    const carried = visit(nov(2), { "p-bench": carry("bench", { warmup: 1 }) });
    expect(sessionVM({ program: asFloating(pushDay()), carried }, "p-bench").subtitle).toBe(
      "Continuing Nov 2's Push — what was done then counts.",
    );
  });

  it("marks the sets that are not saved yet, and counts them across exercises", () => {
    const first = did("p-row", "row", 12, 50);
    const second = did("p-row", "row", 11, 50);
    const bench = did("p-bench", "bench", 10, 40);
    const vm = sessionVM({ program: pushDay(), history: [first, second, bench] }, "p-row", {
      unsaved: [second.id, bench.id],
    });
    expect(vm.form.logged.map((set) => set.unsaved)).toEqual([false, true]);
    expect(vm.footer).toBe("3 sets logged today, 2 not saved yet");
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

    expect(vm.form.set.exercise).toBe("Dumbbell Curl");
    expect(vm.form.setLine).toBe("Set 3");
    expect(vm.form.set.notes).toBe("");
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
        markLabel: undefined,
        skipped: false,
        active: true,
      },
      {
        itemId: "p-row",
        exercise: "Barbell Row",
        detail: "Lats, Rhomboids, Biceps",
        progress: "2/2",
        complete: true,
        markLabel: "complete",
        skipped: false,
        active: false,
      },
      {
        itemId: "p-plank",
        exercise: "Plank",
        detail: "Skipped today",
        progress: "0/1",
        complete: false,
        markLabel: undefined,
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
    expect(dip.logged.map((s) => s.text)).toEqual(["8 + 22 lb"]);
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
