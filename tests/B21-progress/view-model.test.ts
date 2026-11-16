import { describe, expect, it } from "vitest";
import { ExerciseLibrary } from "@nabd/dataset";
import { TrainingStats } from "@nabd/analytics";
import type { ExerciseTrend } from "@nabd/progression";
import { buildProgressVM } from "@nabd/progress";
import {
  BENCH,
  NOW,
  PLANK,
  PULL_UP,
  dayLog,
  exerciseName,
  history,
  loggedSet,
  progressVM,
} from "./fixtures";

describe("fixtures", () => {
  it("only reference exercises that exist in the catalog", () => {
    for (const id of [BENCH, PULL_UP, PLANK]) {
      expect(ExerciseLibrary.catalog.byId(id), id).toBeDefined();
    }
  });
});

describe("buildProgressVM — KPIs", () => {
  it("reports streak, completion, sets this week and active days", () => {
    expect(progressVM().kpis).toEqual([
      { label: "Current streak", value: "3", unit: "days" }, // Mon, Tue, Wed
      { label: "Completion this wk", value: "50", unit: "%" }, // 6 of 12 planned
      { label: "Sets this week", value: "6", unit: "sets" },
      { label: "Active days 30d", value: "4", unit: "days" }, // 19 Oct is day 31
    ]);
  });

  it("shows zeros for someone who has not trained yet", () => {
    const vm = progressVM([], []);

    expect(vm.kpis.map((k) => k.value)).toEqual(["0", "0", "0", "0"]);
    expect(vm.completion.weekPct).toBe("0%");
    expect(vm.progression).toEqual([]);
    expect(vm.triggers.map((t) => t.pct)).toEqual([0, 0, 0]);
    expect(vm.weekly.every((bar) => bar.value === 0 && bar.heightPct === 0)).toBe(true);
    expect(vm.timeOfDay.bars.every((bar) => bar.heightPct === 0)).toBe(true);
  });

  it("keeps the streak alive until the end of a day without sets", () => {
    // Thursday morning, nothing logged yet today: Mon–Wed still counts.
    const thursday = new Date(2026, 10, 19, 8, 0);

    expect(progressVM(history(), dayLog(), thursday).kpis[0]!.value).toBe("3");
    expect(progressVM(history(), dayLog(), new Date(2026, 10, 20, 8, 0)).kpis[0]!.value).toBe("0");
  });
});

describe("buildProgressVM — consistency", () => {
  it("builds the current month's calendar with an intensity level per day", () => {
    const { calendar } = progressVM();
    const level = (day: number) => calendar.cells.find((c) => c.day === day)?.level;

    expect(calendar.month).toBe("November 2026");
    expect(calendar.cells.map((c) => c.day)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(level(1)).toBe(0); // no sets
    expect(level(16)).toBe(1); // 1 set
    expect(level(17)).toBe(1); // 2 sets
    expect(level(18)).toBe(2); // 3 sets, today
    expect(level(19)).toBe(-1); // future
    expect(level(30)).toBe(-1);
  });

  it("uses the top intensity level for a day with more than five sets", () => {
    const busy = Array.from({ length: 6 }, (_, i) =>
      loggedSet(BENCH, [11, 18, 9, i], 8, 60, "idle"),
    );

    expect(progressVM(busy).calendar.cells[17]).toEqual({ day: 18, level: 3 });
  });

  it("charts sets per week for the last eight weeks, ending with this week", () => {
    const { weekly } = progressVM();

    expect(weekly.map((bar) => bar.label)).toEqual([
      "Sep 28",
      "Oct 5",
      "Oct 12",
      "Oct 19",
      "Oct 26",
      "Nov 2",
      "Nov 9",
      "This wk",
    ]);
    expect(weekly.map((bar) => bar.value)).toEqual([0, 0, 0, 1, 0, 0, 2, 6]);
    expect(weekly.map((bar) => bar.heightPct)).toEqual([0, 0, 0, 17, 0, 0, 33, 100]);
    expect(weekly.map((bar) => bar.current === true)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
  });
});

describe("buildProgressVM — completion", () => {
  it("shows this week's completion and a bar for each of the last seven days", () => {
    const { completion } = progressVM();

    expect(completion.weekPct).toBe("50%");
    // Thu 12 … Wed 18
    expect(completion.days.map((d) => d.label)).toEqual(["T", "F", "S", "S", "M", "T", "W"]);
    // Thu skipped (0 of 3), Fri–Sun nothing planned, Mon 1/4, Tue 2/4, Wed 3/4
    expect(completion.days.map((d) => d.value)).toEqual([0, 0, 0, 0, 25, 50, 75]);
    expect(completion.days.map((d) => d.heightPct)).toEqual([0, 0, 0, 0, 25, 50, 75]);
    expect(completion.days.filter((d) => d.current).map((d) => d.label)).toEqual(["W"]);
    expect(completion.days.at(-1)!.current).toBe(true);
  });

  it("never counts extra sets beyond the plan as more than 100%", () => {
    const log = [{ ...dayLog().at(-1)!, planned: 4, done: 9 }];

    const { completion, kpis } = progressVM(history(), log);

    expect(completion.weekPct).toBe("100%");
    expect(completion.days.at(-1)!.value).toBe(100);
    expect(kpis[1]!.value).toBe("100");
  });
});

describe("buildProgressVM — time of day", () => {
  it("has a bar for each hour, labelled 12a … 11p", () => {
    const { bars } = progressVM().timeOfDay;
    const labels = bars.map((bar) => bar.label);

    expect(labels).toHaveLength(24);
    expect(new Set(labels).size).toBe(24);
    expect(labels[0]).toBe("12a");
    expect(labels[9]).toBe("9a");
    expect(labels[11]).toBe("11a");
    expect(labels[12]).toBe("12p");
    expect(labels[18]).toBe("6p");
    expect(labels[23]).toBe("11p");
  });

  it("counts sets by the local hour they were logged and names the peak", () => {
    const { bars, peakLabel } = progressVM().timeOfDay;
    const at = (label: string) => bars.find((bar) => bar.label === label)!;

    expect(peakLabel).toBe("9a");
    expect(at("9a")).toMatchObject({ value: 5, heightPct: 100 });
    expect(at("6p")).toMatchObject({ value: 2, heightPct: 40 });
    expect(at("8a")).toMatchObject({ value: 1, heightPct: 20 });
    expect(at("12p")).toMatchObject({ value: 1, heightPct: 20 });
    expect(at("3p")).toMatchObject({ value: 0, heightPct: 0 });
    expect(bars.reduce((n, bar) => n + bar.value, 0)).toBe(9);
  });

  it("does not flag any hour as the 'current' bar", () => {
    expect(progressVM().timeOfDay.bars.some((bar) => "current" in bar)).toBe(false);
  });
});

describe("buildProgressVM — triggers", () => {
  it("splits sets by what prompted them", () => {
    // 5 idle, 2 timer, 2 manual of 9
    expect(progressVM().triggers.map((t) => [t.label, t.pct])).toEqual([
      ["Idle detected", 56],
      ["Timer", 22],
      ["Manual", 22],
    ]);
  });

  it("gives each trigger its own colour", () => {
    const colors = progressVM().triggers.map((t) => t.color);

    expect(new Set(colors).size).toBe(3);
  });
});

describe("buildProgressVM — progression", () => {
  it("has one row per exercise, in order of first appearance, named from the library", () => {
    expect(progressVM().progression.map((row) => [row.exId, row.exercise])).toEqual([
      [PLANK, "Plank"],
      [BENCH, "Barbell Bench Press"],
      [PULL_UP, "Pull-Up"],
    ]);
  });

  it("shows a loaded lift's best estimated 1RM and its gain since the first session", () => {
    const bench = progressVM().progression.find((row) => row.exId === BENCH)!;

    // e1RM = w × (1 + reps/30): 55×8 → 69.7, 57.5×8 → 72.8, 60×8 → 76 (warm-up ignored)
    expect(bench.pr).toBe("76 kg e1RM");
    expect(bench.gainStr).toBe("+6.3 kg e1RM");
    expect(bench.up).toBe(true);
  });

  it("shows an unloaded exercise in reps", () => {
    const pullUp = progressVM().progression.find((row) => row.exId === PULL_UP)!;

    expect(pullUp).toMatchObject({ pr: "10 reps", gainStr: "+2 reps", up: true });
  });

  it("flags a decline as not up, with a signed loss", () => {
    const plank = progressVM().progression.find((row) => row.exId === PLANK)!;

    expect(plank.gainStr).toMatch(/^-15 /);
    expect(plank.pr).toMatch(/^60 /);
    expect(plank.up).toBe(false);
  });

  it("treats a flat trend as up, with an unsigned zero", () => {
    const flat: ExerciseTrend = {
      exId: PULL_UP,
      series: [8, 8],
      unit: "reps",
      best: 8,
      current: 8,
      gain: 0,
      since: "2026-11-16",
    };

    const [row] = buildProgressVM({
      stats: new TrainingStats([], [], NOW),
      trends: [flat],
      exerciseName,
      now: NOW,
    }).progression;

    expect(row).toMatchObject({ gainStr: "0 reps", up: true });
  });

  it("draws one sparkline point per session, left to right inside the 120×34 box", () => {
    const bench = progressVM().progression.find((row) => row.exId === BENCH)!;
    const points = bench.points.split(" ").map((p) => p.split(",").map(Number) as [number, number]);

    expect(points).toHaveLength(3);
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(120);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(34);
    // rising strength → the line climbs (SVG y shrinks)
    expect(ys[2]).toBeLessThan(ys[0]!);
  });

  it("names an exercise through the lookup it is given", () => {
    const vm = buildProgressVM({
      stats: new TrainingStats(history(), dayLog(), NOW),
      trends: [{ exId: "x", series: [1], unit: "reps", best: 1, current: 1, gain: 0, since: "" }],
      exerciseName: (exId) => `<${exId}>`,
      now: NOW,
    });

    expect(vm.progression[0]!.exercise).toBe("<x>");
  });
});
