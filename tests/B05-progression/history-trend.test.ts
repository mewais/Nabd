import { dateKey } from "@nabd/domain";
import {
  ExerciseHistory,
  exerciseTrends,
  formatAmount,
  formatGain,
  strengthScore,
  trendPoints,
} from "@nabd/progression";
import { exercise, logged, nov } from "../support/domain-factories";

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

  it("knows the latest set, and when there is none", () => {
    expect(history.latest()).toEqual({ reps: 8, weight: 60 });
    const empty = new ExerciseHistory(sets, "unknown");
    expect(empty.isEmpty).toBe(true);
    expect(empty.latest()).toBeNull();
  });

  it("scores loaded sets by estimated 1RM and unloaded ones by reps", () => {
    expect(strengthScore({ reps: 30, weight: 100 })).toBe(200);
    expect(strengthScore({ reps: 12, weight: null })).toBe(12);
    expect(strengthScore({ reps: 12, weight: 0 })).toBe(12);
    expect(history.bestPerSession()).toEqual([50 * (1 + 9 / 30), 60 * (1 + 8 / 30)]);
  });
});

describe("exerciseTrends", () => {
  const bench = exercise({ name: "Bench" });
  const pushUp = exercise({ name: "Push-Up", tracking: "bodyweight_reps" });
  const history = [
    logged(bench, nov(9), 30, 50),
    logged(pushUp, nov(9), 10, null),
    logged(bench, nov(12), 30, 60),
    logged(pushUp, nov(12), 14, null),
  ];

  it("gives one trend per exercise in order of first appearance", () => {
    const [first, second] = exerciseTrends(history, "kg", () => false);
    expect(first).toMatchObject({
      exId: bench.id,
      series: [100, 120],
      unit: "kg e1RM",
      best: 120,
      current: 120,
      gain: 20,
      since: dateKey(nov(9)),
    });
    expect(second).toMatchObject({ exId: pushUp.id, series: [10, 14], unit: "reps", gain: 4 });
  });

  it("converts loaded trends to the display unit", () => {
    const [benchTrend] = exerciseTrends(history, "lb", () => false);
    expect(benchTrend!.unit).toBe("lb e1RM");
    expect(benchTrend!.series[0]).toBeCloseTo(220.5, 1);
  });

  it("measures unloaded timed exercises in seconds", () => {
    const [, hold] = exerciseTrends(history, "kg", (exId) => exId === pushUp.id);
    expect(hold!.unit).toBe("s");
  });

  it("skips exercises that only have warm-ups", () => {
    const onlyWarmups = [logged(bench, nov(9), 10, 20, { setType: "warmup" })];
    expect(exerciseTrends(onlyWarmups, "kg", () => false)).toEqual([]);
  });
});

describe("formatting", () => {
  it("rounds to one decimal and signs gains", () => {
    expect(formatAmount(71.0667, "kg e1RM")).toBe("71.1 kg e1RM");
    expect(formatAmount(12, "reps")).toBe("12 reps");
    expect(formatGain(2.5, "kg")).toBe("+2.5 kg");
    expect(formatGain(-1, "reps")).toBe("-1 reps");
    expect(formatGain(0, "reps")).toBe("0 reps");
  });

  it("maps a series onto an SVG box, highest value at the top", () => {
    expect(trendPoints([1, 2, 3], 100, 50, 10)).toBe("10.0,40.0 50.0,25.0 90.0,10.0");
    expect(trendPoints([5], 100, 50, 10)).toBe("10.0,25.0");
    expect(trendPoints([4, 4], 100, 50, 10)).toBe("10.0,25.0 90.0,25.0");
  });
});
