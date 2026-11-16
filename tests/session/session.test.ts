import type { LoggedSet, Program } from "@nabd/domain";
import { dateKey, freshDayState } from "@nabd/domain";
import { ExerciseHistory, ProgressionAdvisor } from "@nabd/progression";
import { TodayPlan } from "@nabd/scheduling";
import type { PlanItem } from "@nabd/scheduling";
import { Coach, LogSession, describeAdvice, formatPerformance, formatTarget } from "@nabd/session";
import {
  exercise,
  logged,
  lookupIn,
  nov,
  prescription,
  row,
  warmup,
  working,
} from "../support/domain-factories";

const TODAY = nov(16);
const curl = exercise({ name: "Curl" });
const plank = exercise({ name: "Plank", tracking: "duration" });
const curlRow = row(curl.id, [warmup(15), working(8, 12), working(8, 12)]);
const plankRow = row(plank.id, [working(45)], { repMode: "time" });

const program: Program = {
  name: "P",
  type: "fixed",
  schedule: "floating",
  days: [{ id: "d", name: "D", weekday: null, exercises: [curlRow, plankRow], slots: [] }],
};

function itemsFor(history: LoggedSet[]): { curlItem: PlanItem; plankItem: PlanItem } {
  const plan = TodayPlan.build({
    program,
    date: TODAY,
    dayState: freshDayState(TODAY),
    rotation: {},
    history,
    lookup: lookupIn([curl, plank]),
  });
  return { curlItem: plan.item(curlRow.id)!, plankItem: plan.item(plankRow.id)! };
}

const coachFor = (history: LoggedSet[]): Coach =>
  new Coach(history, new ProgressionAdvisor(2.5), dateKey(TODAY));

describe("Coach", () => {
  const lastWeek = [logged(curl, nov(9, 10), 8, 25), logged(curl, nov(9, 11), 7, 25)];

  it("gives no progression advice for a warm-up set", () => {
    expect(coachFor(lastWeek).adviceFor(itemsFor(lastWeek).curlItem)).toBeNull();
  });

  it("advises each working set against the same working set of last session", () => {
    const warmedUp = [
      ...lastWeek,
      logged(curl, nov(16, 9), 15, 10, { planItemId: curlRow.id, setType: "warmup" }),
    ];
    expect(coachFor(warmedUp).adviceFor(itemsFor(warmedUp).curlItem)?.primary).toEqual({
      reps: 9,
      weight: 25,
    });

    const oneDone = [...warmedUp, logged(curl, nov(16, 10), 9, 25, { planItemId: curlRow.id })];
    const second = coachFor(oneDone).adviceFor(itemsFor(oneDone).curlItem);
    expect(second?.kind).toBe("reach_range");
    expect(second?.basis).toEqual({ reps: 7, weight: 25 });
  });

  it("pre-fills the form with the very set the advice compares against", () => {
    const warmedUp = [
      ...lastWeek,
      logged(curl, nov(16, 9), 15, 10, { planItemId: curlRow.id, setType: "warmup" }),
    ];
    const item = itemsFor(warmedUp).curlItem;
    const coach = coachFor(warmedUp);
    // Last week went 8 then 7: the first working set is compared against the 8.
    expect(coach.startFor(item)).toEqual({ reps: 8, weight: 25 });
    expect(coach.startFor(item)).toEqual(coach.adviceFor(item)!.basis);
  });

  it("pre-fills with the previous set once the exercise has one of that kind today", () => {
    const today = [
      ...lastWeek,
      logged(curl, nov(16, 9), 15, 10, { planItemId: curlRow.id, setType: "warmup" }),
      logged(curl, nov(16, 10), 10, 27.5, { planItemId: curlRow.id }),
    ];
    expect(coachFor(today).startFor(itemsFor(today).curlItem)).toEqual({ reps: 10, weight: 27.5 });
  });

  describe("a warm-up has a memory of its own", () => {
    const lastWarmup = logged(curl, nov(9, 9), 15, 10, { setType: "warmup" });

    it("starts from the last warm-up logged, not from last session's working set", () => {
      const history = [lastWarmup, ...lastWeek];
      expect(coachFor(history).startFor(itemsFor(history).curlItem)).toEqual({
        reps: 15,
        weight: 10,
      });
    });

    it("the working set after it starts from the working set, not from the warm-up", () => {
      const history = [
        lastWarmup,
        ...lastWeek,
        logged(curl, nov(16, 9), 12, 12.5, { planItemId: curlRow.id, setType: "warmup" }),
      ];
      expect(coachFor(history).startFor(itemsFor(history).curlItem)).toEqual({
        reps: 8,
        weight: 25,
      });
    });

    it("with no warm-up on record, starts from what the warm-up asks for", () => {
      expect(coachFor(lastWeek).startFor(itemsFor(lastWeek).curlItem)).toEqual({
        reps: 15,
        weight: 0,
      });
    });
  });

  it("a drop set starts from last session's same set, not from the working set just done", () => {
    const squat = exercise({ name: "Squat" });
    const squatRow = row(squat.id, [working(8, 12), { type: "drop", a: 12 }]);
    const history = [
      logged(squat, nov(9, 10), 8, 60),
      logged(squat, nov(9, 11), 12, 40, { setType: "drop" }),
      logged(squat, nov(16, 10), 9, 60, { planItemId: squatRow.id }),
    ];
    const item = TodayPlan.build({
      program: { ...program, days: [{ ...program.days[0]!, exercises: [squatRow] }] },
      date: TODAY,
      dayState: freshDayState(TODAY),
      rotation: {},
      history,
      lookup: lookupIn([squat]),
    }).item(squatRow.id)!;
    expect(item.nextSet?.type).toBe("drop");
    expect(coachFor(history).startFor(item)).toEqual({ reps: 12, weight: 40 });
  });

  it("with no history, starts from the prescription", () => {
    const { curlItem, plankItem } = itemsFor([]);
    expect(coachFor([]).startFor(curlItem)).toEqual({ reps: 15, weight: 0 });
    expect(coachFor([]).startFor(plankItem)).toEqual({ reps: 45, weight: null });
  });
});

describe("LogSession", () => {
  const { curlItem, plankItem } = itemsFor([]);
  const session = LogSession.open(curlItem, { reps: 8, weight: 25 }, "idle");

  it("opens on an exercise with a starting draft and remembers what prompted it", () => {
    expect(session).toMatchObject({ itemId: curlRow.id, reps: 8, weight: 25, trigger: "idle" });
    expect(session.performance(curlItem)).toEqual({ reps: 8, weight: 25 });
  });

  it("steps reps by one, seconds by five, and never below one", () => {
    expect(session.stepReps(curlItem, 1).reps).toBe(9);
    expect(session.withReps(curlItem, 1).stepReps(curlItem, -1).reps).toBe(1);
    const hold = session.focus(plankItem, { reps: 45, weight: null });
    expect(hold.stepReps(plankItem, 1).reps).toBe(50);
    expect(hold.performance(plankItem)).toEqual({ reps: 50 - 5, weight: null });
  });

  it("steps and sets load, never below zero, ignoring garbage", () => {
    expect(session.stepWeight(1, 2.5).weight).toBe(27.5);
    expect(session.stepWeight(-20, 2.5).weight).toBe(0);
    expect(session.withWeight(12.3456).weight).toBe(12.346);
    expect(session.withWeight(Number.NaN).weight).toBe(25);
    expect(session.withReps(curlItem, Number.NaN).reps).toBe(8);
    expect(session.withReps(curlItem, 9.9).reps).toBe(9);
  });

  it("ignores a number no set could have, and stops stepping at the same bounds", () => {
    expect(session.withReps(curlItem, 0).reps).toBe(8);
    expect(session.withReps(curlItem, 999).reps).toBe(999);
    expect(session.withReps(curlItem, 1000).reps).toBe(8);
    expect(session.withReps(curlItem, 999).stepReps(curlItem, 1).reps).toBe(999);
    expect(session.withWeight(-1).weight).toBe(25);
    expect(session.withWeight(1000).weight).toBe(1000);
    expect(session.withWeight(99999).weight).toBe(25);
    expect(session.withWeight(1000).stepWeight(1, 2.5).weight).toBe(1000);
    // A hold is counted in seconds, of which a set can have many more.
    const hold = session.focus(plankItem, { reps: 45, weight: null });
    expect(hold.withReps(plankItem, 3600).reps).toBe(3600);
    expect(hold.withReps(plankItem, 6 * 60 * 60 + 1).reps).toBe(45);
  });

  it("keeps the trigger and the running rest when moving to another exercise", () => {
    const resting = session.resting(nov(16, 10, 0), 90);
    const moved = resting.focus(plankItem, { reps: 45, weight: null });
    expect(moved.trigger).toBe("idle");
    expect(moved.restRemaining(nov(16, 10, 1))).toBe(30);
  });

  it("becomes a history row for its exercise, stamped with the plan item and the moment", () => {
    const at = nov(16, 10, 5);
    expect(session.withReps(curlItem, 9).toLoggedSet(curlItem, "set-1", at)).toEqual({
      id: "set-1",
      exId: curl.id,
      exercise: "Curl",
      group: curl.group,
      muscles: [...curl.primary, ...curl.secondary],
      value: 9,
      weight: 25,
      ts: at.toISOString(),
      date: dateKey(at),
      trigger: "idle",
      planItemId: curlRow.id,
      // The curl's next prescribed set is its warm-up.
      setType: "warmup",
    });
    const hold = session.focus(plankItem, { reps: 45, weight: null });
    expect(hold.toLoggedSet(plankItem, "set-2", at)).toMatchObject({ value: 45, weight: null });
  });

  it("counts rest down to zero; no rest prescribed means none", () => {
    const resting = session.resting(nov(16, 10, 0), 90);
    expect(resting.restRemaining(nov(16, 10, 0))).toBe(90);
    expect(resting.restRemaining(nov(16, 10, 5))).toBe(0);
    expect(session.resting(nov(16, 10, 0), 0).restRemaining(nov(16, 10, 0))).toBe(0);
    expect(session.restRemaining(nov(16, 10, 0))).toBe(0);
  });
});

describe("wording", () => {
  it("describes a performed set for each way of tracking", () => {
    expect(formatPerformance({ reps: 9, weight: 25 }, "weight_reps", "kg")).toBe("9 × 25 kg");
    expect(formatPerformance({ reps: 9, weight: 11.34 }, "weight_reps", "lb")).toBe("9 × 25 lb");
    expect(formatPerformance({ reps: 12, weight: null }, "bodyweight_reps", "kg")).toBe("12 reps");
    expect(formatPerformance({ reps: 8, weight: 10 }, "weighted_bodyweight", "kg")).toBe(
      "8 + 10 kg",
    );
    expect(formatPerformance({ reps: 8, weight: 20 }, "assisted_bodyweight", "kg")).toBe(
      "8 − 20 kg assist",
    );
    expect(formatPerformance({ reps: 45, weight: null }, "duration", "kg")).toBe("45 s");
    expect(formatPerformance({ reps: 8, weight: 21.25 }, "weight_reps", "kg")).toBe("8 × 21.25 kg");
    expect(formatPerformance({ reps: 40, weight: 20 }, "weight_duration", "kg")).toBe(
      "40 s · 20 kg",
    );
  });

  it("a bodyweight exercise with nothing added or taken off is worded as plain reps", () => {
    expect(formatPerformance({ reps: 12, weight: 0 }, "weighted_bodyweight", "kg")).toBe("12 reps");
    expect(formatPerformance({ reps: 8, weight: 0 }, "assisted_bodyweight", "kg")).toBe("8 reps");
    // A bar with nothing on it is still a load to state.
    expect(formatPerformance({ reps: 8, weight: 0 }, "weight_reps", "kg")).toBe("8 × 0 kg");
  });

  it("advises an unloaded bodyweight exercise in reps first, then in added weight", () => {
    const advisor = new ProgressionAdvisor(2.5);
    const pullUp = exercise({ name: "Pull-Up", tracking: "weighted_bodyweight" });
    const advice = (reps: number) =>
      describeAdvice(
        advisor.advise({
          tracking: pullUp.tracking,
          prescription: prescription([working(8, 12)]),
          setIndex: 0,
          history: new ExerciseHistory([logged(pullUp, nov(9), reps, 0)], pullUp.id),
          date: dateKey(TODAY),
        }),
        pullUp.tracking,
        "kg",
      );
    expect(advice(10)).toMatchObject({ primary: "11 reps", basis: "Last time: 10 reps" });
    expect(advice(12)).toMatchObject({
      primary: "8 + 2.5 kg",
      alternative: "13 reps",
      basis: "Last time: 12 reps",
    });
  });

  it("describes what a prescribed set asks for", () => {
    const ranged = prescription([working(8, 12)], { intensity: "rpe" });
    expect(formatTarget({ type: "working", a: 8, b: 12, val: 8 }, ranged)).toBe(
      "Working set · 8–12 reps · RPE 8",
    );
    expect(formatTarget({ type: "warmup", a: 12 }, ranged)).toBe("Warm-up · 12 reps");
    const pct = prescription([working(5)], { repMode: "fixed", intensity: "pct" });
    expect(formatTarget({ type: "drop", a: 5, val: 70 }, pct)).toBe("Drop set · 5 reps · 70% 1RM");
    expect(formatTarget({ type: "working", a: 45 }, plankRow)).toBe("Working set · 45 s");
  });

  it("puts advice into words, with the alternative and what it was based on", () => {
    const history = [logged(curl, nov(9), 8, 25)];
    const warmUp = logged(curl, nov(16, 9), 15, 10, { planItemId: curlRow.id, setType: "warmup" });
    const all = [...history, warmUp];
    const real = coachFor(all).adviceFor(itemsFor(all).curlItem);
    expect(describeAdvice(real, "weight_reps", "kg")).toEqual({
      primary: "9 × 25 kg",
      alternative: "8 × 27.5 kg",
      reason: "Inside your range — beat last time.",
      basis: "Last time: 8 × 25 kg",
    });
    expect(describeAdvice(null, "weight_reps", "kg")).toBeNull();
  });

  it("counts a single rep as one rep", () => {
    expect(formatPerformance({ reps: 1, weight: null }, "bodyweight_reps", "kg")).toBe("1 rep");
    expect(formatTarget({ type: "working", a: 1 }, prescription([]))).toBe("Working set · 1 rep");
    expect(formatTarget({ type: "working", a: 1, b: 3 }, prescription([]))).toBe(
      "Working set · 1–3 reps",
    );
  });

  it("asks for a starting weight instead of suggesting zero the first time", () => {
    const first = new ProgressionAdvisor(2.5).startingPoint("weight_reps", working(8, 12));
    expect(describeAdvice(first, "weight_reps", "kg")).toMatchObject({
      primary: "8 reps — pick a starting weight",
      basis: null,
    });
    const hold = new ProgressionAdvisor(2.5).startingPoint("weight_duration", working(30));
    expect(describeAdvice(hold, "weight_duration", "kg")!.primary).toBe(
      "30 s — pick a starting weight",
    );
    // An unweighted first time has nothing to pick.
    const reps = new ProgressionAdvisor(2.5).startingPoint("bodyweight_reps", working(8, 12));
    expect(describeAdvice(reps, "bodyweight_reps", "kg")!.primary).toBe("8 reps");
    // Nor does a bodyweight exercise that can take weight: it starts without any.
    for (const tracking of ["weighted_bodyweight", "assisted_bodyweight"] as const) {
      const start = new ProgressionAdvisor(2.5).startingPoint(tracking, working(8, 12));
      expect(describeAdvice(start, tracking, "kg")!.primary).toBe("8 reps");
    }
  });
});
