/**
 * B22 · @nabd/modals — buildSessionVM: what the set logger shows for a draft
 * session against today's plan.
 */

import { buildSessionVM } from "@nabd/modals";
import {
  buildWorld,
  did,
  lastWeek,
  mondayProgram,
  planRow,
  pushDay,
  work,
} from "../support/plan-fixtures";
import { nov } from "../support/domain-factories";
import { openSession, sessionVM } from "./fixtures";

const warmedUp = () => [...lastWeek(), did("p-bench", "bench", 10, 40, { setType: "warmup" })];

describe("buildSessionVM", () => {
  it("is null when the session's exercise is no longer in today's plan", () => {
    const { session, coach, now } = openSession({ program: pushDay() }, "p-bench");
    const withoutBench = buildWorld({
      program: mondayProgram([planRow("p-row", "row", [work(8, 12)])]),
    }).plan;

    expect(buildSessionVM({ session, plan: withoutBench, coach, unit: "kg", now })).toBeNull();
  });

  it("starts on the warm-up: its target, no advice, the form pre-filled with last time", () => {
    const vm = sessionVM({ program: pushDay(), history: lastWeek() }, "p-bench");

    expect(vm.exercise).toBe("Bench Press");
    expect(vm.setLabel).toBe("Set 1 of 3");
    expect(vm.target).toBe("Warm-up · 10 reps");
    expect(vm.notes).toBe("Pause at the chest");
    expect(vm.muscleNames).toEqual(["Chest", "Triceps", "Front Delts"]);
    expect(vm.advice).toBeNull();
    // The last working set of last week was 7 × 60 kg.
    expect(vm).toMatchObject({
      repsLabel: "Reps",
      reps: 7,
      weight: 60,
      weightLabel: "Weight (kg)",
    });
    expect(vm.logged).toEqual([]);
    expect(vm.setsToday).toBe(0);
    expect(vm.restLabel).toBeNull();
  });

  it("on a working set, carries the coach's advice", () => {
    const vm = sessionVM({ program: pushDay(), history: warmedUp() }, "p-bench");

    expect(vm.setLabel).toBe("Set 2 of 3");
    expect(vm.target).toBe("Working set · 8–12 reps · RPE 8");
    expect(vm.advice).toEqual({
      primary: "9 × 60 kg",
      alternative: "8 × 62.5 kg",
      reason: "Inside your range — beat last time.",
      basis: "Last time: 8 × 60 kg",
    });
  });

  it("shows loads in pounds for lb users (weights stay stored in kg)", () => {
    const vm = sessionVM({ program: pushDay(), history: warmedUp() }, "p-bench", { unit: "lb" });

    expect(vm.weightLabel).toBe("Weight (lb)");
    expect(vm.weight).toBe(132.3);
    expect(vm.advice?.primary).toBe("9 × 132.3 lb");
    expect(vm.logged.map((s) => s.text)).toEqual(["10 × 88.2 lb"]);
  });

  it("lists this exercise's sets from today, oldest first, with ids to undo them", () => {
    const first = did("p-bench", "bench", 10, 40, { setType: "warmup" });
    const second = did("p-bench", "bench", 9, 60);
    const other = did("p-row", "row", 12, 50);
    const vm = sessionVM(
      { program: pushDay(), history: [...lastWeek(), first, other, second] },
      "p-bench",
    );

    expect(vm.logged).toEqual([
      { id: first.id, text: "10 × 40 kg" },
      { id: second.id, text: "9 × 60 kg" },
    ]);
    expect(vm.setsToday).toBe(3);
  });

  it("once the prescription is done, further sets are extras with no target", () => {
    const history = [did("p-row", "row", 12, 50), did("p-row", "row", 11, 50)];
    const vm = sessionVM({ program: pushDay(), history }, "p-row");

    expect(vm.setLabel).toMatch(/^All 2 sets done/);
    expect(vm.target).toBeNull();
  });

  it("an unplanned exercise just counts sets", () => {
    const input = {
      program: pushDay(),
      extras: [{ id: "x-curl", exId: "curl" }],
      history: [did("x-curl", "curl", 12, 10), did("x-curl", "curl", 10, 10)],
    };
    const vm = sessionVM(input, "x-curl");

    expect(vm.exercise).toBe("Dumbbell Curl");
    expect(vm.setLabel).toBe("Set 3");
    expect(vm.target).toBeNull();
    expect(vm.notes).toBe("");
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
        muscles: "Chest, Triceps, Front Delts",
        progress: "1/3",
        complete: false,
        skipped: false,
        active: true,
      },
      {
        itemId: "p-row",
        exercise: "Barbell Row",
        muscles: "Lats, Rhomboids, Biceps",
        progress: "2/2",
        complete: true,
        skipped: false,
        active: false,
      },
      {
        itemId: "p-plank",
        exercise: "Plank",
        muscles: "Abs, Obliques",
        progress: "0/1",
        complete: false,
        skipped: true,
        active: false,
      },
    ]);
  });

  it("a timed, unweighted exercise asks for seconds and no load", () => {
    const history = [...lastWeek(), did("p-plank", "plank", 35, null)];
    const vm = sessionVM({ program: pushDay(), history }, "p-plank");

    expect(vm.repsLabel).toBe("Sec");
    expect(vm.reps).toBe(35);
    expect(vm.weight).toBeNull();
    expect(vm.logged.map((s) => s.text)).toEqual(["35 s"]);
  });

  it("names the load for what it is on assisted and weighted bodyweight exercises", () => {
    const program = mondayProgram([
      planRow("p-pullup", "pullup", [work(6, 10), work(6, 10)]),
      planRow("p-dip", "dip", [work(6, 10), work(6, 10)]),
    ]);
    const history = [did("p-pullup", "pullup", 8, 20), did("p-dip", "dip", 8, 10)];

    const pullup = sessionVM({ program, history }, "p-pullup");
    expect(pullup.weightLabel).toBe("Assistance (kg)");
    expect(pullup.weight).toBe(20);
    expect(pullup.logged.map((s) => s.text)).toEqual(["8 − 20 kg assist"]);

    const dip = sessionVM({ program, history }, "p-dip", { unit: "lb" });
    expect(dip.weightLabel).toBe("Added weight (lb)");
    expect(dip.weight).toBe(22);
    expect(dip.logged.map((s) => s.text)).toEqual(["8 + 22 lb"]);
  });

  it("counts down the rest after a set, then drops the label", () => {
    const { session, plan, coach } = openSession({ program: pushDay() }, "p-bench");
    const loggedAt = nov(16, 10, 30);
    const resting = session.resting(loggedAt, 90);
    const at = (now: Date) => buildSessionVM({ session: resting, plan, coach, unit: "kg", now });
    const secondsLater = (s: number) => new Date(loggedAt.getTime() + s * 1000);

    expect(at(loggedAt)?.restLabel).toBe("Rest 1:30");
    expect(at(secondsLater(10))?.restLabel).toBe("Rest 1:20");
    expect(at(secondsLater(85))?.restLabel).toBe("Rest 0:05");
    expect(at(secondsLater(90))?.restLabel).toBeNull();
    expect(at(secondsLater(300))?.restLabel).toBeNull();
  });
});
