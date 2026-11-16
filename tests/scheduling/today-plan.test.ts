import type { LoggedSet, Program } from "@nabd/domain";
import { dateKey } from "@nabd/domain";
import { TodayPlan } from "@nabd/scheduling";
import { logged, nov, row, workingSets, warmup, working } from "../support/builders";
import { EX } from "../support/exercises";
import { benchRow, floatingPushPull, flyRow, pushPull, raiseRow } from "../support/programs";
import { MONDAY, benchSet, build, dayState, input } from "./fixtures";

describe("which day is today", () => {
  const dayOn = (program: Program, date: Date, dayId: string | null = null): string | null =>
    TodayPlan.build({ ...input(), program, date, dayState: dayState(date, { dayId }) }).dayName;

  it("weekday schedule picks the day pinned to that weekday, or none", () => {
    expect(dayOn(pushPull, MONDAY)).toBe("Push");
    expect(dayOn(pushPull, nov(17))).toBeNull();
    expect(dayOn(pushPull, nov(18), "mon")).toBe("Pull");
  });

  it("floating schedule is on the day it remembers, or the first one", () => {
    expect(dayOn(floatingPushPull, MONDAY)).toBe("Push");
    expect(dayOn(floatingPushPull, MONDAY, "wed")).toBe("Pull");
    expect(dayOn(floatingPushPull, MONDAY, "deleted")).toBe("Push");
    expect(dayOn({ ...floatingPushPull, days: [] }, MONDAY, "wed")).toBeNull();
  });
});

describe("TodayPlan for a fixed day", () => {
  it("lists the day's exercises with every prescribed set, warm-ups included", () => {
    const plan = build();
    expect(plan.dayName).toBe("Push");
    expect(plan.items.map((i) => i.exercise.name)).toEqual([
      "Bench Press",
      "Dumbbell Fly",
      "Lateral Raise",
    ]);
    expect(plan.items.map((i) => i.planned)).toEqual([4, 3, 3]);
    expect(plan.setsPlanned).toBe(10);
    expect(plan.setsRemaining).toBe(10);
    expect(plan.nextItem?.id).toBe(benchRow.id);
    expect(plan.nextItem?.nextSet).toEqual(warmup(12));
  });

  it("is empty on a rest day and drops exercises missing from the library", () => {
    expect(
      TodayPlan.build({ ...input(), date: nov(17), dayState: dayState(nov(17)) }).items,
    ).toEqual([]);
    const orphan: Program = {
      ...pushPull,
      days: [{ ...pushPull.days[0]!, exercises: [row("gone", workingSets(3)), benchRow] }],
    };
    expect(build([], dayState(MONDAY), orphan).items.map((i) => i.exercise.name)).toEqual([
      "Bench Press",
    ]);
  });

  it("counts today's sets toward their plan item — and only today's", () => {
    const yesterday = logged(EX.bench, nov(15), 10, 40, { planItemId: benchRow.id });
    const plan = build([yesterday, benchSet(10, { setType: "warmup" }), benchSet(11)]);
    const item = plan.item(benchRow.id)!;
    expect(item.done).toBe(2);
    expect(item.remaining).toBe(2);
    expect(item.workingSetsDone).toBe(1);
    expect(item.nextSet).toEqual(working(8, 12));
    expect(item.status).toBe("pending");
    expect(plan.setsDone).toBe(2);
  });

  it("marks an exercise done once every prescribed set is logged, and allows extra sets", () => {
    const sets = [10, 11, 12, 13, 14].map((h) => benchSet(h));
    const item = build(sets).item(benchRow.id)!;
    expect(item.status).toBe("done");
    expect(item.remaining).toBe(0);
    expect(item.nextSet).toBeNull();
  });

  describe("which prescribed set comes next", () => {
    // Bench is a warm-up and three working sets.
    const next = (sets: LoggedSet[], program = pushPull) =>
      build(sets, dayState(MONDAY), program).item(benchRow.id)!.nextSet;
    const warmupSet = benchSet(9, { setType: "warmup" });

    it("follows the prescription in order", () => {
      expect(next([])?.type).toBe("warmup");
      expect(next([warmupSet])?.type).toBe("working");
    });

    it("is the warm-up when the warm-up is the set that was undone", () => {
      expect(next([benchSet(10), benchSet(11), benchSet(12)])?.type).toBe("warmup");
    });

    it("is a working set after the warm-up was taken out of the plan mid-day", () => {
      const noWarmup: Program = {
        ...pushPull,
        days: [
          { ...pushPull.days[0]!, exercises: [{ ...benchRow, sets: workingSets(3) }] },
          pushPull.days[1]!,
        ],
      };
      expect(next([warmupSet, benchSet(10)], noWarmup)?.type).toBe("working");
      // With every set logged it stays done, whatever kinds the sets were.
      const item = build([warmupSet, benchSet(10), benchSet(11)], dayState(MONDAY), noWarmup).item(
        benchRow.id,
      )!;
      expect(item).toMatchObject({ status: "done", nextSet: null });
    });
  });

  it("a skipped exercise owes nothing and is not offered next", () => {
    const plan = build([], dayState(MONDAY, { skipped: [benchRow.id] }));
    expect(plan.item(benchRow.id)!.status).toBe("skipped");
    expect(plan.setsPlanned).toBe(6);
    expect(plan.plannedSetsDone).toBe(0);
    expect(plan.nextItem?.id).toBe(flyRow.id);
  });

  it("includes exercises added just for today as open-ended extras", () => {
    const plan = build(
      [logged(EX.dip, nov(16, 15), 12, null, { planItemId: "x1" })],
      dayState(MONDAY, { extras: [{ id: "x1", exId: EX.dip.id }] }),
    );
    const extra = plan.item("x1")!;
    expect(extra.isExtra).toBe(true);
    expect(extra.planned).toBe(0);
    expect(extra.done).toBe(1);
    expect(plan.setsPlanned).toBe(10);
  });

  it("is complete only when nothing is owed and something was done", () => {
    const allSkipped = dayState(MONDAY, { skipped: [benchRow.id, flyRow.id, raiseRow.id] });
    expect(build([], allSkipped).isComplete).toBe(false);
    const onlyBench = dayState(MONDAY, { skipped: [flyRow.id, raiseRow.id] });
    expect(
      build(
        [10, 11, 12, 13].map((h) => benchSet(h)),
        onlyBench,
      ).isComplete,
    ).toBe(true);
  });
});

describe("where the logger goes after a set", () => {
  const flySet = (hour: number) => logged(EX.fly, nov(16, hour), 12, 10, { planItemId: flyRow.id });
  const raiseSet = (hour: number) =>
    logged(EX.raise, nov(16, hour), 12, 5, { planItemId: raiseRow.id });

  it("stays on the exercise while it owes sets", () => {
    expect(build([benchSet(10)]).focusAfter(benchRow.id)?.id).toBe(benchRow.id);
  });

  it("moves to the next exercise once it is finished", () => {
    const plan = build([10, 11, 12, 13].map((h) => benchSet(h)));
    expect(plan.focusAfter(benchRow.id)?.id).toBe(flyRow.id);
  });

  it("alternates between superset partners", () => {
    expect(build([flySet(10)]).focusAfter(flyRow.id)?.id).toBe(raiseRow.id);
    expect(build([flySet(10), raiseSet(11)]).focusAfter(raiseRow.id)?.id).toBe(flyRow.id);
  });

  it("stays on a finished exercise the user chose to do more of, superset or not", () => {
    const more = build([9, 10, 11, 12, 13].map((h) => benchSet(h)));
    expect(more.focusAfter(benchRow.id)?.id).toBe(benchRow.id);
    const moreFly = build([9, 10, 11, 12].map(flySet));
    expect(moreFly.focusAfter(flyRow.id)?.id).toBe(flyRow.id);
  });

  it("stays on an extra, and returns nothing when the day is finished", () => {
    const withExtra = build(
      [logged(EX.dip, nov(16, 15), 12, null, { planItemId: "x1" })],
      dayState(MONDAY, { extras: [{ id: "x1", exId: EX.dip.id }] }),
    );
    expect(withExtra.focusAfter("x1")?.id).toBe("x1");
    const state = dayState(MONDAY, { skipped: [flyRow.id, raiseRow.id] });
    const finished = build(
      [10, 11, 12, 13].map((h) => benchSet(h)),
      state,
    );
    expect(finished.focusAfter(benchRow.id)).toBeNull();
  });
});

describe("the completion record", () => {
  it("counts only planned sets, each exercise capped at its prescription", () => {
    const history = [
      // Five bench sets against four prescribed, and an extra exercise on top.
      ...[9, 10, 11, 12, 13].map((h) => benchSet(h)),
      logged(EX.dip, nov(16, 15), 12, null, { planItemId: "x1" }),
    ];
    const plan = build(history, dayState(MONDAY, { extras: [{ id: "x1", exId: EX.dip.id }] }));
    expect(plan.setsDone).toBe(6);
    expect(plan.plannedSetsDone).toBe(4);
    expect(plan.ledger.record()).toEqual({ date: dateKey(MONDAY), planned: 10, done: 4 });
  });

  it("a skipped exercise still counts as planned; a day without a plan has no record", () => {
    const skipped = build([], dayState(MONDAY, { skipped: [flyRow.id] }));
    expect(skipped.ledger.record()).toEqual({ date: dateKey(MONDAY), planned: 10, done: 0 });
    const tuesday = TodayPlan.build({ ...input(), date: nov(17), dayState: dayState(nov(17)) });
    expect(tuesday.ledger.record()).toBeNull();
  });

  it("a floating day is only on record once it has a set, or the plan has moved past it", () => {
    const idle = build([], dayState(MONDAY), floatingPushPull);
    expect(idle.ledger.record()).toBeNull();
    expect(idle.ledger.closedRecord()).toEqual({ date: dateKey(MONDAY), planned: 10, done: 0 });
    expect(build([benchSet(9)], dayState(MONDAY), floatingPushPull).ledger.record()).toEqual({
      date: dateKey(MONDAY),
      planned: 10,
      done: 1,
    });
  });
});

describe("a day where everything was skipped", () => {
  it("is told apart from a rest day and from a finished day", () => {
    const allSkipped = dayState(MONDAY, { skipped: [benchRow.id, flyRow.id, raiseRow.id] });
    expect(build([], allSkipped).isAllSkipped).toBe(true);
    expect(build([], dayState(MONDAY, { skipped: [benchRow.id] })).isAllSkipped).toBe(false);
    expect(TodayPlan.build({ ...input(), date: nov(17) }).isAllSkipped).toBe(false);
  });
});
