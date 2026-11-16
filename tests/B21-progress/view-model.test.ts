import { describe, expect, it } from "vitest";
import { ExerciseLibrary } from "@nabd/dataset";
import type { ProgressVM } from "@nabd/progress";
import {
  BENCH,
  NEW_USER,
  NO_COVERAGE,
  PLANK,
  PULL_UP,
  loggedSet,
  progressVM,
  shown,
} from "./fixtures";

const progressionRow = (vm: ProgressVM, exId: string) =>
  shown(vm.progression).find((row) => row.exId === exId);

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

  it("keeps the streak alive until the end of a day without sets", () => {
    // Thursday morning, nothing logged yet today: Mon–Wed still counts.
    const streakAt = (now: Date) => progressVM({ now }).kpis[0]?.value;

    expect(streakAt(new Date(2026, 10, 19, 8, 0))).toBe("3");
    expect(streakAt(new Date(2026, 10, 20, 8, 0))).toBe("0");
  });
});

describe("buildProgressVM — a new user", () => {
  const vm = progressVM(NEW_USER);

  it("shows zeros in the KPIs and an untouched calendar and weekly chart", () => {
    expect(vm.kpis.map((kpi) => kpi.value)).toEqual(["0", "0", "0", "0"]);
    const levels = new Set(vm.consistency.calendar.cells.map((cell) => cell.level));
    expect([...levels].sort()).toEqual(["future", "none"]);
    expect(vm.consistency.weekly.every((bar) => bar.heightPct === 0)).toBe(true);
    expect(vm.consistency.weekly.every((bar) => bar.value === undefined)).toBe(true);
  });

  it("explains each section that has nothing to show instead of charting zeros", () => {
    expect(vm.completion).toEqual({ empty: expect.stringMatching(/^Nothing planned yet/) });
    expect(vm.timeOfDay).toEqual({ empty: expect.stringMatching(/^No sets logged yet/) });
    expect(vm.triggers).toEqual({ empty: expect.stringMatching(/^No sets logged yet/) });
    expect(vm.progression).toEqual({ empty: expect.stringMatching(/^No sets logged yet/) });
    expect(vm.heatmap.muscles).toEqual({ empty: "No sets in the last 7 days." });
  });

  it("charts completion as soon as one day has a plan, even with nothing done", () => {
    const planned = progressVM({ sets: [], log: [{ date: "2026-11-18", planned: 4, done: 0 }] });

    expect(shown(planned.completion).weekPct).toBe("0%");
  });
});

describe("buildProgressVM — consistency", () => {
  it("builds the current month's calendar with an intensity level per day", () => {
    const { calendar } = progressVM().consistency;
    const level = (day: number) => calendar.cells.find((cell) => cell.day === day)?.level;

    expect(calendar.month).toBe("November 2026");
    expect(calendar.cells.map((cell) => cell.day)).toEqual(
      Array.from({ length: 30 }, (_, i) => i + 1),
    );
    expect(level(1)).toBe("none");
    expect(level(16)).toBe("light"); // 1 set
    expect(level(17)).toBe("light"); // 2 sets
    expect(level(18)).toBe("medium"); // 3 sets, today
    expect(level(19)).toBe("future");
    expect(level(30)).toBe("future");
  });

  it("uses the top intensity level for a day with more than five sets", () => {
    const busy = Array.from({ length: 6 }, (_, i) =>
      loggedSet(BENCH, [11, 18, 9, i], 8, 60, "idle"),
    );

    expect(progressVM({ sets: busy }).consistency.calendar.cells[17]).toEqual({
      day: 18,
      level: "full",
    });
  });

  it("starts the month under the weekday its first day falls on", () => {
    const calendarAt = (now: Date) => progressVM({ now }).consistency.calendar;

    expect(calendarAt(new Date(2026, 10, 18, 10, 30)).firstWeekday).toBe(0); // Sun 1 Nov
    expect(calendarAt(new Date(2026, 11, 2, 10, 30)).firstWeekday).toBe(2); // Tue 1 Dec
    expect(calendarAt(new Date(2026, 11, 2, 10, 30)).weekdays).toHaveLength(7);
  });

  it("charts sets per week for the last eight weeks, ending with this week", () => {
    const { weekly } = progressVM().consistency;

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
    // Empty weeks carry no figure.
    expect(weekly.map((bar) => bar.value)).toEqual(
      [undefined, undefined, undefined, "1", undefined, undefined, "2", "6"], // prettier-ignore
    );
    expect(weekly.map((bar) => bar.heightPct)).toEqual([0, 0, 0, 17, 0, 0, 33, 100]);
    expect(weekly.filter((bar) => bar.highlight).map((bar) => bar.label)).toEqual(["This wk"]);
  });
});

describe("buildProgressVM — completion", () => {
  it("shows this week's completion and a bar for each of the last seven days", () => {
    const completion = shown(progressVM().completion);

    expect(completion.weekPct).toBe("50%");
    // Thu 12 … Wed 18
    expect(completion.days.map((day) => day.label)).toEqual(["T", "F", "S", "S", "M", "T", "W"]);
    // Thu skipped (0 of 3), Fri–Sun nothing planned, Mon 1/4, Tue 2/4, Wed 3/4
    expect(completion.days.map((day) => day.heightPct)).toEqual([0, 0, 0, 0, 25, 50, 75]);
    // Today is the highlighted bar.
    expect(completion.days.map((day) => day.highlight)).toEqual(
      [false, false, false, false, false, false, true], // prettier-ignore
    );
  });

  it("never counts extra sets beyond the plan as more than 100%", () => {
    const log = [{ date: "2026-11-18", planned: 4, done: 9 }];

    const { completion, kpis } = progressVM({ log });

    expect(shown(completion).weekPct).toBe("100%");
    expect(shown(completion).days.at(-1)?.heightPct).toBe(100);
    expect(kpis[1]?.value).toBe("100");
  });
});

describe("buildProgressVM — time of day", () => {
  const { bars, peak } = shown(progressVM().timeOfDay);

  it("has a bar for each hour and captions every third one", () => {
    expect(bars).toHaveLength(24);
    expect(bars.map((bar) => bar.label).filter((label) => label !== "")).toEqual(
      ["12a", "3a", "6a", "9a", "12p", "3p", "6p", "9p"], // prettier-ignore
    );
    expect(bars[9]?.label).toBe("9a");
    expect(bars[18]?.label).toBe("6p");
  });

  it("counts sets by the local hour they were logged", () => {
    // 5 sets at 9, 2 at 18, 1 at 8, 1 at 12
    expect(bars[9]?.heightPct).toBe(100);
    expect(bars[18]?.heightPct).toBe(40);
    expect(bars[8]?.heightPct).toBe(20);
    expect(bars[12]?.heightPct).toBe(20);
    expect(bars[15]?.heightPct).toBe(0);
  });

  it("names the busiest hour and highlights only its bar", () => {
    expect(peak).toBe("Peak 9a");
    expect(bars.flatMap((bar, hour) => (bar.highlight ? [hour] : []))).toEqual([9]);
  });
});

describe("buildProgressVM — triggers", () => {
  it("splits sets by what prompted them", () => {
    // 5 idle, 2 timer, 2 manual of 9
    expect(shown(progressVM().triggers)).toEqual([
      { trigger: "idle", label: "Idle detected", pct: 56, share: "56%" },
      { trigger: "timer", label: "Timer", pct: 22, share: "22%" },
      { trigger: "manual", label: "Manual", pct: 22, share: "22%" },
    ]);
  });
});

describe("buildProgressVM — muscle coverage", () => {
  it("lists the trained muscles, most covered first, with what each needs", () => {
    const coverage = { ...NO_COVERAGE, lats: 40, chest: 80, triceps: 25 };

    const { heatmap } = progressVM({ coverage });

    expect(heatmap.coverage).toBe(coverage);
    expect(shown(heatmap.muscles)).toEqual([
      { muscle: "chest", pct: 80, recommendation: "rest" },
      { muscle: "lats", pct: 40, recommendation: "none" },
      { muscle: "triceps", pct: 25, recommendation: "push" },
    ]);
  });
});

describe("buildProgressVM — progression", () => {
  const vm = progressVM();

  it("has one row per exercise, in order of first appearance, named from the library", () => {
    expect(shown(vm.progression).map((row) => [row.exId, row.exercise])).toEqual([
      [PLANK, "Plank"],
      [BENCH, "Barbell Bench Press"],
      [PULL_UP, "Pull-Up"],
    ]);
  });

  it("shows a loaded lift's best estimated 1RM and its gain since the first session", () => {
    // e1RM = w × (1 + reps/30): 55×8 → 69.7, 57.5×8 → 72.8, 60×8 → 76 (warm-up ignored)
    expect(progressionRow(vm, BENCH)).toMatchObject({
      best: "76 kg e1RM",
      gain: "+6.3 kg e1RM",
      up: true,
    });
  });

  it("carries the best score of each session, oldest first, for the trend line", () => {
    const series = progressionRow(vm, BENCH)?.series ?? [];

    expect(series).toHaveLength(3);
    expect([...series]).toEqual([...series].sort((a, b) => a - b));
    expect(progressionRow(vm, PULL_UP)?.series).toEqual([8, 10]);
  });

  it("shows an unloaded exercise in reps", () => {
    expect(progressionRow(vm, PULL_UP)).toMatchObject({
      best: "10 reps",
      gain: "+2 reps",
      up: true,
    });
  });

  it("flags a decline as not up, with a signed loss", () => {
    const plank = progressionRow(vm, PLANK);

    expect(plank?.gain).toMatch(/^-15 /);
    expect(plank?.best).toMatch(/^60 /);
    expect(plank?.up).toBe(false);
  });

  it("treats a flat trend as up, with an unsigned zero", () => {
    const flat = [
      loggedSet(PULL_UP, [11, 16, 9, 0], 8, null, "idle"),
      loggedSet(PULL_UP, [11, 18, 9, 0], 8, null, "idle"),
    ];

    expect(progressionRow(progressVM({ sets: flat }), PULL_UP)).toMatchObject({
      gain: "0 reps",
      up: true,
    });
  });
});
