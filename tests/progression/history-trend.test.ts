import { dateKey } from "@nabd/domain";
import type { ExerciseLookup, LoggedSet, WeightUnit } from "@nabd/domain";
import {
  ExerciseHistory,
  ExerciseProgress,
  assistedScore,
  estimatedMax,
  trendIn,
} from "@nabd/progression";
import { exercise, logged, lookupIn, nov } from "../support/builders";

describe("ExerciseHistory", () => {
  const squat = exercise();
  const other = exercise();
  const sets = [
    logged(squat, nov(12, 10), 8, 60),
    logged(squat, nov(9, 10), 8, 50),
    logged(squat, nov(9, 11), 9, 50),
    logged(other, nov(9, 12), 20, null),
    logged(squat, nov(12, 9), 10, 20, { setType: "warmup" }),
  ];
  const history = new ExerciseHistory(sets, squat.id);

  it("groups one exercise's working sets by day, oldest first", () => {
    expect(history.dates).toEqual([dateKey(nov(9)), dateKey(nov(12))]);
    expect(history.on(dateKey(nov(9)))).toEqual([
      { reps: 8, weight: 50 },
      { reps: 9, weight: 50 },
    ]);
    expect(history.on(dateKey(nov(12)))).toEqual([{ reps: 8, weight: 60 }]);
  });

  it("returns sessions before a date, newest first", () => {
    expect(history.sessionsBefore(dateKey(nov(12)), 2)).toEqual([history.on(dateKey(nov(9)))]);
    expect(history.sessionsBefore(dateKey(nov(16)), 1)).toEqual([history.on(dateKey(nov(12)))]);
    expect(history.sessionsBefore(dateKey(nov(9)), 2)).toEqual([]);
  });

  it("is empty for an exercise that was never logged", () => {
    const empty = new ExerciseHistory(sets, "unknown");
    expect(empty.isEmpty).toBe(true);
    expect(empty.on(dateKey(nov(9)))).toEqual([]);
  });

  it("estimates a one-rep max from loaded sets, and nothing from a set without load", () => {
    expect(estimatedMax({ reps: 15, weight: 100 })).toBe(150);
    // Reps are not kilograms: an unloaded set must never score its rep count.
    expect(estimatedMax({ reps: 12, weight: null })).toBe(0);
    expect(estimatedMax({ reps: 12, weight: 0 })).toBe(0);
    expect(history.bestPerSession(estimatedMax)).toEqual([50 * (1 + 9 / 30), 60 * (1 + 8 / 30)]);
  });

  it("reads no more than 15 reps from a set, so a slip of the keyboard cannot inflate the estimate", () => {
    expect(estimatedMax({ reps: 999, weight: 60 })).toBe(estimatedMax({ reps: 15, weight: 60 }));
    expect(estimatedMax({ reps: 16, weight: 60 })).toBe(90);
    const slip = new ExerciseHistory([logged(squat, nov(9), 999, 60)], squat.id);
    expect(slip.estimateBefore(dateKey(nov(16)))).toBe(90);
  });

  it("estimates the max from the best set of the latest session before a date", () => {
    expect(history.estimateBefore(dateKey(nov(12)))).toBe(50 * (1 + 9 / 30));
    expect(history.estimateBefore(dateKey(nov(16)))).toBe(60 * (1 + 8 / 30));
    // Nothing before the first session, and a session without load is no estimate.
    expect(history.estimateBefore(dateKey(nov(9)))).toBeUndefined();
    const bodyweight = new ExerciseHistory([logged(other, nov(9), 20, null)], other.id);
    expect(bodyweight.estimateBefore(dateKey(nov(16)))).toBeUndefined();
  });

  it("remembers warm-ups apart from the sessions: the last one, or the last one of a day", () => {
    expect(history.latest("warmup")).toEqual({ reps: 10, weight: 20 });
    expect(history.latest("warmup", dateKey(nov(9)))).toBeUndefined();
    expect(history.latest("working", dateKey(nov(9)))).toEqual({ reps: 9, weight: 50 });
    expect(history.latest("drop")).toBeUndefined();
  });

  it("knows whether the exercise was ever loaded, warm-ups aside", () => {
    expect(history.hasLoad).toBe(true);
    const pushUp = exercise();
    const unloaded = [
      logged(pushUp, nov(9), 12, 0),
      logged(pushUp, nov(9, 9), 10, 5, { setType: "warmup" }),
    ];
    expect(new ExerciseHistory(unloaded, pushUp.id).hasLoad).toBe(false);
  });

  it("scores assisted sets higher the less assistance they took", () => {
    const heavyHelp = assistedScore({ reps: 8, weight: 30 });
    const lightHelp = assistedScore({ reps: 8, weight: 10 });
    expect(lightHelp).toBeGreaterThan(heavyHelp);
    expect(assistedScore({ reps: 8, weight: 0 })).toBeGreaterThan(lightHelp);
  });
});

describe("ExerciseProgress", () => {
  /** Every trend with its figures as the user reads them in `unit`. */
  const trends = (sets: LoggedSet[], unit: WeightUnit, lookup: ExerciseLookup) =>
    new ExerciseProgress(sets, lookup).trends.map((trend) => ({
      ...trend,
      ...trendIn(trend, unit),
    }));

  const bench = exercise({ name: "Bench" });
  const pushUp = exercise({ name: "Push-Up", tracking: "bodyweight_reps" });
  const history = [
    logged(bench, nov(9), 15, 50),
    logged(pushUp, nov(9), 10, null),
    logged(bench, nov(12), 15, 60),
    logged(pushUp, nov(12), 14, null),
  ];
  const library = lookupIn([bench, pushUp]);

  it("gives one trend per exercise in order of first appearance", () => {
    const [first, second] = trends(history, "kg", library);
    expect(first).toMatchObject({
      exId: bench.id,
      series: [75, 90],
      unit: "kg e1RM",
      best: 90,
      current: 90,
      gain: 15,
      since: dateKey(nov(9)),
    });
    expect(second).toMatchObject({ exId: pushUp.id, series: [10, 14], unit: "reps", gain: 4 });
  });

  it("converts loaded trends to the display unit", () => {
    const [benchTrend] = trends(history, "lb", library);
    expect(benchTrend!.unit).toBe("lb e1RM");
    expect(benchTrend!.series[0]).toBeCloseTo(165.35, 1);
  });

  describe("one unit per exercise, never reps and kilograms in one series", () => {
    const pullUp = exercise({ name: "Pull-Up", tracking: "weighted_bodyweight" });
    const only = lookupIn([pullUp]);

    it("an exercise that was never loaded is trended in reps, even when logged with 0 kg", () => {
      const sessions = [logged(pullUp, nov(9), 8, 0), logged(pullUp, nov(12), 10, 0)];
      expect(trends(sessions, "kg", only)).toMatchObject([
        { series: [8, 10], unit: "reps", best: 10, gain: 2 },
      ]);
    });

    it("once it has been loaded, every session is an estimated 1RM: unloaded ones score 0", () => {
      const sessions = [
        logged(pullUp, nov(9), 8, 0),
        logged(pullUp, nov(12), 10, 0),
        logged(pullUp, nov(16), 5, 5),
      ];
      const [trend] = trends(sessions, "kg", only);
      expect(trend).toMatchObject({ unit: "kg e1RM", series: [0, 0, 5.83], best: 5.83 });
      expect(trend!.gain).toBeCloseTo(5.83);
    });

    it("the same holds for a barbell lift whose first set was logged at the prefilled 0 kg", () => {
      const sessions = [logged(bench, nov(9), 8, 0), logged(bench, nov(12), 15, 60)];
      expect(trends(sessions, "kg", library)).toMatchObject([{ unit: "kg e1RM", series: [0, 90] }]);
    });
  });

  it("measures unloaded timed exercises in seconds", () => {
    const [, hold] = trends(history, "kg", lookupIn([bench, { ...pushUp, tracking: "duration" }]));
    expect(hold!.unit).toBe("s");
  });

  it("an assisted exercise trends up as the assistance comes off", () => {
    const pullUp = exercise({ name: "Assisted Pull-Up", tracking: "assisted_bodyweight" });
    const sessions = [
      logged(pullUp, nov(9), 8, 30),
      logged(pullUp, nov(12), 8, 20),
      logged(pullUp, nov(12), 6, 25),
      logged(pullUp, nov(16), 8, 10),
    ];
    const [trend] = trends(sessions, "kg", lookupIn([pullUp]));
    expect(trend).toMatchObject({
      series: [-30, -20, -10],
      unit: "kg vs bodyweight",
      best: -10,
      current: -10,
      gain: 20,
    });
  });

  it("falls back to the logged values for an exercise no longer in the library", () => {
    const [benchTrend, pushUpTrend] = trends(history, "kg", lookupIn([]));
    expect(benchTrend!.unit).toBe("kg e1RM");
    expect(pushUpTrend!.unit).toBe("reps");
  });

  it("skips exercises that only have warm-ups", () => {
    const onlyWarmups = [logged(bench, nov(9), 10, 20, { setType: "warmup" })];
    expect(trends(onlyWarmups, "kg", library)).toEqual([]);
  });

  it("finds the trend of one exercise, and none for one never logged", () => {
    const progress = new ExerciseProgress(history, library);
    expect(progress.trendOf(pushUp.id)).toMatchObject({ exId: pushUp.id, series: [10, 14] });
    expect(progress.trendOf("never-logged")).toBeUndefined();
  });

  it("names an exercise from the library, else from its logged sets, else by its id", () => {
    const progress = new ExerciseProgress(history, lookupIn([bench]));
    expect(progress.nameOf(bench.id)).toBe("Bench");
    expect(progress.nameOf(pushUp.id)).toBe("Push-Up");
    expect(progress.nameOf("unknown")).toBe("unknown");
  });
});
