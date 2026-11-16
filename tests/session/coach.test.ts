import { DEFAULT_SETTINGS, dateKey, freshDayState } from "@nabd/domain";
import { TodayPlan } from "@nabd/scheduling";
import { carry, exercise, logged, lookupIn, nov, row, visit, working } from "../support/builders";
import { TODAY, curl, curlRow, itemsFor, coachFor, program } from "./fixtures";

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

    it("with no warm-up on record, starts from half the last working load, for the reps asked", () => {
      // Last week's last working set was 25 kg; half of it, on the 2.5 kg step, is 12.5 kg.
      expect(coachFor(lastWeek).startFor(itemsFor(lastWeek).curlItem)).toEqual({
        reps: 15,
        weight: 12.5,
      });
    });
  });

  it("a drop set starts from last session's same set, not from the working set just done", () => {
    const squat = exercise({ name: "Squat" });
    const squatRow = row(squat.id, [working(8, 12), { type: "drop", amount: 12 }]);
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
      workDays: DEFAULT_SETTINGS.workDays,
    }).item(squatRow.id)!;
    expect(item.nextSet?.type).toBe("drop");
    expect(coachFor(history).startFor(item)).toEqual({ reps: 12, weight: 40 });
  });

  describe("on a floating day that comes back with only the rest", () => {
    // Warm-up and one working set were done on Friday; last week went 8 then 7.
    const FRIDAY = nov(13);
    const carried = visit(FRIDAY, { [curlRow.id]: carry(curl.id, { warmup: 1, working: 1 }) });
    const friday = [
      logged(curl, nov(13, 9), 15, 10, { planItemId: curlRow.id, setType: "warmup" }),
      logged(curl, nov(13, 10), 6, 30, { planItemId: curlRow.id }),
    ];
    const history = [...lastWeek, ...friday];

    it("advises the next owed set against the same set of the previous session", () => {
      const item = itemsFor(lastWeek, carried).curlItem;
      expect(item.nextSet).toEqual(working(8, 12));
      const advice = coachFor(lastWeek).adviceFor(item);
      // Set 2 of the day is compared with set 2 of last week: the 7.
      expect(advice?.basis).toEqual({ reps: 7, weight: 25 });
    });

    it("is one session with the days it continues: their sets are not 'last time'", () => {
      const item = itemsFor(history, carried).curlItem;
      const advice = coachFor(history, dateKey(FRIDAY)).adviceFor(item);
      expect(advice?.basis).toEqual({ reps: 7, weight: 25 });
      expect(advice?.kind).toBe("reach_range");
    });

    it("starts the form from the session's own last set of the kind, done on an earlier day", () => {
      const item = itemsFor(history, carried).curlItem;
      expect(coachFor(history, dateKey(FRIDAY)).startFor(item)).toEqual({ reps: 6, weight: 30 });
    });

    it("gives no advice while the warm-up is what is owed, whatever the day before did", () => {
      const noneYet = itemsFor(lastWeek).curlItem;
      expect(coachFor(lastWeek).adviceFor(noneYet)).toBeNull();
    });
  });

  it("gives no progression advice for a warm-up even where an intensity is prescribed", () => {
    const rpe = { ...curlRow, intensity: "rpe" as const };
    const item = TodayPlan.build({
      program: { ...program, days: [{ ...program.days[0]!, exercises: [rpe] }] },
      date: TODAY,
      dayState: freshDayState(TODAY),
      rotation: {},
      history: lastWeek,
      lookup: lookupIn([curl]),
      workDays: DEFAULT_SETTINGS.workDays,
    }).item(rpe.id)!;
    expect(coachFor(lastWeek).adviceFor(item)).toBeNull();
  });

  it("with no history, starts from the prescription", () => {
    const { curlItem, plankItem } = itemsFor([]);
    expect(coachFor([]).startFor(curlItem)).toEqual({ reps: 15, weight: 0 });
    expect(coachFor([]).startFor(plankItem)).toEqual({ reps: 45, weight: null });
  });
});
