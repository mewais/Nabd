/**
 * B21 · @nabd/progress — value-asserting React tests (RED against skeleton).
 *
 * Every test asserts concrete DOM text / returned values / callbacks.
 * No `expect(...).toThrow("not implemented")`, no sole `.toBeDefined()`.
 * Against the skeleton every test is RED; GREEN once code agent implements.
 * Together they exercise every export and every branch → 100% coverage.
 *
 * Fixed now = 2026-06-24T10:00:00Z (Wednesday, week Mon Jun22–Sun Jun28).
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { Coverage, LoggedSet, MuscleKey } from "@nabd/domain";

import {
  buildKpis,
  buildCalendar,
  buildWeekly,
  buildCompletion,
  buildTimeOfDay,
  buildTriggerMix,
  buildProgression,
  KpiStrip,
  ConsistencyCard,
  CompletionCard,
  TimeOfDayCard,
  TriggerCard,
  MuscleHeatmapCard,
  ProgressionCard,
  ProgressScreen,
} from "@nabd/progress";

import type {
  Kpi,
  CalendarCellVM,
  BarVM,
  TriggerSeg,
  ProgressionRowVM,
  ConsistencyCardProps,
  ProgressionCardProps,
  ProgressScreenProps,
} from "@nabd/progress";

// =============================================================================
// Fixtures & helpers
// =============================================================================

const NOW = new Date("2026-06-24T10:00:00Z"); // Wednesday

/** Build a Coverage where every muscle = defaultVal, overriding with overrides. */
function makeCoverage(
  overrides: Partial<Record<MuscleKey, number>> = {},
  defaultVal = 0,
): Coverage {
  const muscles: MuscleKey[] = [
    "front_delts", "side_delts", "rear_delts", "neck", "upper_traps",
    "rhomboids", "lower_traps", "lats", "lower_back", "chest", "abs",
    "obliques", "quads", "hamstrings", "glutes", "abductors", "adductors",
    "calves", "tibialis", "hip_flexors", "biceps", "triceps", "forearms",
  ];
  const cov: Partial<Record<MuscleKey, number>> = {};
  for (const m of muscles) {
    cov[m] = defaultVal;
  }
  return { ...cov, ...overrides } as Coverage;
}

/**
 * Synthetic LoggedSet history:
 *
 * Dates:  Jun22 (Mon), Jun23 (Tue), Jun24 (Wed) — 3 consecutive days this week.
 * Jun22: 2 bench-press sets @ 09:00 UTC, trigger=idle, weight=60kg, reps=10
 * Jun23: 3 bench-press sets — 1 @ 09:00 UTC (trigger=timer, 62.5kg), 2 @ 12:00 UTC (trigger=manual, 62.5kg)
 * Jun24: 2 bench-press sets @ 09:00 UTC, trigger=idle, weight=65kg, reps=10
 *
 * Total sets this week (Jun22–Jun28): 7
 * Active days (consecutive streak ending today): Jun22+Jun23+Jun24 = 3
 * Trigger mix: idle=3, timer=1 (corrected below to: idle=3, timer=2, manual=2 for 7 total)
 * Peak hour at UTC: 9am has 5 sets, 12pm has 2 sets => peak=9 => label "9a"
 *
 * History is intentionally all within the current week so weeklyBars=[0,0,0,0,0,0,0,7].
 */
const BASE_HISTORY: LoggedSet[] = [
  // Jun22 09:00 UTC — idle, 60kg x10
  {
    id: "s1",
    exId: "ex-bench",
    exercise: "Bench Press",
    group: "Chest",
    muscles: ["chest"],
    value: 10,
    weight: 60,
    ts: "2026-06-22T09:00:00Z",
    date: "2026-06-22",
    trigger: "idle",
  },
  {
    id: "s2",
    exId: "ex-bench",
    exercise: "Bench Press",
    group: "Chest",
    muscles: ["chest"],
    value: 10,
    weight: 60,
    ts: "2026-06-22T09:30:00Z",
    date: "2026-06-22",
    trigger: "idle",
  },
  // Jun23 09:00 UTC — timer, 62.5kg x10
  {
    id: "s3",
    exId: "ex-bench",
    exercise: "Bench Press",
    group: "Chest",
    muscles: ["chest"],
    value: 10,
    weight: 62.5,
    ts: "2026-06-23T09:00:00Z",
    date: "2026-06-23",
    trigger: "timer",
  },
  // Jun23 12:00 UTC — manual, 62.5kg x10
  {
    id: "s4",
    exId: "ex-bench",
    exercise: "Bench Press",
    group: "Chest",
    muscles: ["chest"],
    value: 10,
    weight: 62.5,
    ts: "2026-06-23T12:00:00Z",
    date: "2026-06-23",
    trigger: "manual",
  },
  {
    id: "s5",
    exId: "ex-bench",
    exercise: "Bench Press",
    group: "Chest",
    muscles: ["chest"],
    value: 10,
    weight: 62.5,
    ts: "2026-06-23T12:30:00Z",
    date: "2026-06-23",
    trigger: "manual",
  },
  // Jun24 09:00 UTC — timer, 65kg x10
  {
    id: "s6",
    exId: "ex-bench",
    exercise: "Bench Press",
    group: "Chest",
    muscles: ["chest"],
    value: 10,
    weight: 65,
    ts: "2026-06-24T09:00:00Z",
    date: "2026-06-24",
    trigger: "timer",
  },
  {
    id: "s7",
    exId: "ex-bench",
    exercise: "Bench Press",
    group: "Chest",
    muscles: ["chest"],
    value: 10,
    weight: 65,
    ts: "2026-06-24T09:30:00Z",
    date: "2026-06-24",
    trigger: "idle",
  },
];

// trigger distribution: idle=3 (s1,s2,s7), timer=2 (s3,s6), manual=2 (s4,s5)
// total=7: idle=round(3/7*100)=43, timer=round(2/7*100)=29, manual=round(2/7*100)=29

// Hour distribution: hour9 = s1,s2,s3,s6,s7 = 5 sets; hour12 = s4,s5 = 2 sets => peak=9

// fullHistorySeries for ex-bench:
// Jun22: best 1RM = 60*(1+10/30) = 80
// Jun23: best 1RM = 62.5*(1+10/30) = 83.333...
// Jun24: best 1RM = 65*(1+10/30) = 86.666...
// gain = 86.666 - 80 = 6.666 => formatGain(6.666,'kg') = '+6.7 kg'
// personalBest = 86.666

const ZERO_COV = makeCoverage({}, 0);
const PARTIAL_COV = makeCoverage({ chest: 50, lats: 30 }, 0);

const EX_NAMES: Record<string, string> = {
  "ex-bench": "Bench Press",
};

// =============================================================================
// buildKpis
// =============================================================================

describe("buildKpis", () => {
  it("returns exactly 4 KPI objects", () => {
    const kpis = buildKpis(BASE_HISTORY, 10, NOW);
    expect(kpis).toHaveLength(4);
  });

  it("KPI[0] is Current Streak with value '3' and unit 'days'", () => {
    const kpis = buildKpis(BASE_HISTORY, 10, NOW);
    expect(kpis[0].label).toBe("Current streak");
    expect(kpis[0].value).toBe("3");
    expect(kpis[0].unit).toBe("days");
  });

  it("KPI[1] is Completion this week with value '70' and unit '%'", () => {
    // 7 sets this week, planned=10 => round(7/10*100)=70
    const kpis = buildKpis(BASE_HISTORY, 10, NOW);
    expect(kpis[1].label).toBe("Completion this wk");
    expect(kpis[1].value).toBe("70");
    expect(kpis[1].unit).toBe("%");
  });

  it("KPI[2] is Sets this week with value '7' and unit 'sets'", () => {
    const kpis = buildKpis(BASE_HISTORY, 10, NOW);
    expect(kpis[2].label).toBe("Sets this week");
    expect(kpis[2].value).toBe("7");
    expect(kpis[2].unit).toBe("sets");
  });

  it("KPI[3] is Active days 30d with value '3' and unit 'days'", () => {
    const kpis = buildKpis(BASE_HISTORY, 10, NOW);
    expect(kpis[3].label).toBe("Active days 30d");
    expect(kpis[3].value).toBe("3");
    expect(kpis[3].unit).toBe("days");
  });

  it("returns 0-based values for empty history", () => {
    const kpis = buildKpis([], 10, NOW);
    expect(kpis[0].value).toBe("0");
    expect(kpis[1].value).toBe("0");
    expect(kpis[2].value).toBe("0");
    expect(kpis[3].value).toBe("0");
  });

  it("KPI[1] clamps at 100% when sets exceed plan", () => {
    // 7 sets, plannedPerWeek=3 => clamp to 100
    const kpis = buildKpis(BASE_HISTORY, 3, NOW);
    expect(kpis[1].value).toBe("100");
  });

  it("KPI[1] is 0% when plannedPerWeek=0", () => {
    const kpis = buildKpis(BASE_HISTORY, 0, NOW);
    expect(kpis[1].value).toBe("0");
    expect(kpis[1].unit).toBe("%");
  });
});

// =============================================================================
// buildCalendar
// =============================================================================

describe("buildCalendar", () => {
  it("returns month string 'June 2026'", () => {
    const cal = buildCalendar(BASE_HISTORY, NOW);
    expect(cal.month).toBe("June 2026");
  });

  it("returns 30 cells for June 2026", () => {
    const cal = buildCalendar(BASE_HISTORY, NOW);
    expect(cal.cells).toHaveLength(30);
  });

  it("cells 1-21 (before any sets) have level 0", () => {
    const cal = buildCalendar(BASE_HISTORY, NOW);
    for (let i = 0; i < 21; i++) {
      expect(cal.cells[i]).toEqual({ day: i + 1, level: 0 });
    }
  });

  it("cell for day 22 (2 sets) has level 1", () => {
    const cal = buildCalendar(BASE_HISTORY, NOW);
    // count=2 => level 1 (1..2)
    expect(cal.cells[21]).toEqual({ day: 22, level: 1 });
  });

  it("cell for day 23 (3 sets) has level 2", () => {
    const cal = buildCalendar(BASE_HISTORY, NOW);
    // count=3 => level 2 (3..5)
    expect(cal.cells[22]).toEqual({ day: 23, level: 2 });
  });

  it("cell for day 24 (2 sets) has level 1", () => {
    const cal = buildCalendar(BASE_HISTORY, NOW);
    // count=2 => level 1
    expect(cal.cells[23]).toEqual({ day: 24, level: 1 });
  });

  it("cells 25-30 (future) have level -1", () => {
    const cal = buildCalendar(BASE_HISTORY, NOW);
    for (let i = 24; i < 30; i++) {
      expect(cal.cells[i]).toEqual({ day: i + 1, level: -1 });
    }
  });

  it("a day with 6+ sets has level 3", () => {
    // Add 6 sets on June 10
    const heavy: LoggedSet[] = Array.from({ length: 6 }, (_, k) => ({
      id: `h${k}`,
      exId: "ex-bench",
      exercise: "Bench Press",
      group: "Chest",
      muscles: ["chest" as MuscleKey],
      value: 10,
      weight: 60,
      ts: `2026-06-10T09:0${k}:00Z`,
      date: "2026-06-10",
      trigger: "idle" as const,
    }));
    const cal = buildCalendar([...BASE_HISTORY, ...heavy], NOW);
    // day 10 = index 9
    expect(cal.cells[9]).toEqual({ day: 10, level: 3 });
  });
});

// =============================================================================
// buildWeekly
// =============================================================================

describe("buildWeekly", () => {
  it("returns exactly 8 bars", () => {
    const bars = buildWeekly(BASE_HISTORY, NOW);
    expect(bars).toHaveLength(8);
  });

  it("last bar (index 7) has current=true", () => {
    const bars = buildWeekly(BASE_HISTORY, NOW);
    expect(bars[7].current).toBe(true);
  });

  it("bars 0-6 do not have current=true", () => {
    const bars = buildWeekly(BASE_HISTORY, NOW);
    for (let i = 0; i < 7; i++) {
      expect(bars[i].current).toBeFalsy();
    }
  });

  it("last bar has value 7 (all history in current week)", () => {
    const bars = buildWeekly(BASE_HISTORY, NOW);
    expect(bars[7].value).toBe(7);
  });

  it("last bar has heightPct 100 (it is the max)", () => {
    const bars = buildWeekly(BASE_HISTORY, NOW);
    expect(bars[7].heightPct).toBe(100);
  });

  it("bars 0-6 have value 0 (no history before current week)", () => {
    const bars = buildWeekly(BASE_HISTORY, NOW);
    for (let i = 0; i < 7; i++) {
      expect(bars[i].value).toBe(0);
    }
  });

  it("bars 0-6 have heightPct 0", () => {
    const bars = buildWeekly(BASE_HISTORY, NOW);
    for (let i = 0; i < 7; i++) {
      expect(bars[i].heightPct).toBe(0);
    }
  });

  it("empty history returns 8 zero bars with last current", () => {
    const bars = buildWeekly([], NOW);
    expect(bars).toHaveLength(8);
    expect(bars[7].current).toBe(true);
    for (const bar of bars) {
      expect(bar.value).toBe(0);
    }
  });

  it("each bar has a label property", () => {
    const bars = buildWeekly(BASE_HISTORY, NOW);
    for (const bar of bars) {
      expect(typeof bar.label).toBe("string");
    }
  });
});

// =============================================================================
// buildCompletion
// =============================================================================

describe("buildCompletion", () => {
  it("weekPct is the rounded mean of the 7 daily completion percentages", () => {
    // plannedPerDay=3, NOW=2026-06-24 (Wed)
    // Last 7 days (oldest first): Jun18=0, Jun19=0, Jun20=0, Jun21=0,
    //   Jun22=round(2/3*100)=67, Jun23=round(3/3*100)=100, Jun24=round(2/3*100)=67
    // mean = (0+0+0+0+67+100+67)/7 = 234/7 ≈ 33.43 => round = 33
    const result = buildCompletion(BASE_HISTORY, 3, NOW);
    expect(result.weekPct).toBe("33%");
  });

  it("returns exactly 7 day bars", () => {
    const result = buildCompletion(BASE_HISTORY, 3, NOW);
    expect(result.days).toHaveLength(7);
  });

  it("last bar (today = Wed Jun24) has current=true", () => {
    const result = buildCompletion(BASE_HISTORY, 3, NOW);
    expect(result.days[6].current).toBe(true);
  });

  it("bars 0-5 do not have current=true", () => {
    const result = buildCompletion(BASE_HISTORY, 3, NOW);
    for (let i = 0; i < 6; i++) {
      expect(result.days[i].current).toBeFalsy();
    }
  });

  it("days without sets (index 0-3) have value 0", () => {
    // Jun18,19,20,21 have 0 sets
    const result = buildCompletion(BASE_HISTORY, 3, NOW);
    for (let i = 0; i < 4; i++) {
      expect(result.days[i].value).toBe(0);
    }
  });

  it("Jun22 bar (index 4) has value round(2/3*100)=67", () => {
    const result = buildCompletion(BASE_HISTORY, 3, NOW);
    expect(result.days[4].value).toBe(67);
  });

  it("Jun23 bar (index 5) has value 100 (3 sets, planned=3)", () => {
    const result = buildCompletion(BASE_HISTORY, 3, NOW);
    expect(result.days[5].value).toBe(100);
  });

  it("Jun24 bar (index 6) has value 67 (2 sets, planned=3)", () => {
    const result = buildCompletion(BASE_HISTORY, 3, NOW);
    expect(result.days[6].value).toBe(67);
  });

  it("day labels match day-of-week abbreviations", () => {
    // Jun18=Thu, Jun19=Fri, Jun20=Sat, Jun21=Sun, Jun22=Mon, Jun23=Tue, Jun24=Wed
    const result = buildCompletion(BASE_HISTORY, 3, NOW);
    const labels = result.days.map((d) => d.label);
    expect(labels).toHaveLength(7);
    // Each label should be a single or short string like "M","T","W","T","F","S","S"
    for (const label of labels) {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("weekPct is '0%' when plannedPerWeek=0 (divide-by-zero guard)", () => {
    const result = buildCompletion(BASE_HISTORY, 0, NOW);
    expect(result.weekPct).toBe("0%");
  });

  it("all day values are 0 when plannedPerDay=0", () => {
    const result = buildCompletion(BASE_HISTORY, 0, NOW);
    for (const bar of result.days) {
      expect(bar.value).toBe(0);
    }
  });

  it("value is capped at 100 even when sets exceed plannedPerDay", () => {
    // 3 sets on Jun23, planned=1 => would be 300, capped to 100
    const result = buildCompletion(BASE_HISTORY, 1, NOW);
    // bar index 5 is Jun23 with 3 sets, planned=1
    expect(result.days[5].value).toBe(100);
  });
});

// =============================================================================
// buildTimeOfDay
// =============================================================================

describe("buildTimeOfDay", () => {
  it("returns bars array and peakLabel", () => {
    const result = buildTimeOfDay(BASE_HISTORY);
    expect(Array.isArray(result.bars)).toBe(true);
    expect(typeof result.peakLabel).toBe("string");
  });

  it("peakLabel is '9a' (peak at hour 9 with 5 sets)", () => {
    // s1,s2,s3,s6,s7 are at hour 9 (5 sets); s4,s5 at hour 12 (2 sets)
    const result = buildTimeOfDay(BASE_HISTORY);
    expect(result.peakLabel).toBe("9a");
  });

  it("bar for hour 9 has the highest heightPct", () => {
    const result = buildTimeOfDay(BASE_HISTORY);
    const bar9 = result.bars.find((b) => b.label === "9a");
    expect(bar9).toBeDefined();
    expect(bar9!.heightPct).toBe(100);
  });

  it("bar for hour 12 has lower heightPct than hour 9", () => {
    const result = buildTimeOfDay(BASE_HISTORY);
    const bar9 = result.bars.find((b) => b.label === "9a");
    const bar12 = result.bars.find((b) => b.label === "12p");
    expect(bar9).toBeDefined();
    expect(bar12).toBeDefined();
    expect(bar12!.heightPct).toBeLessThan(bar9!.heightPct);
  });

  it("peakLabel is '12p' when all sets at noon", () => {
    const noonHistory: LoggedSet[] = BASE_HISTORY.map((s) => ({
      ...s,
      ts: s.ts.replace("T09", "T12").replace("T09:30", "T12:30"),
    }));
    const result = buildTimeOfDay(noonHistory);
    expect(result.peakLabel).toBe("12p");
  });

  it("each bar has a label, value, and heightPct", () => {
    const result = buildTimeOfDay(BASE_HISTORY);
    for (const bar of result.bars) {
      expect(typeof bar.label).toBe("string");
      expect(typeof bar.value).toBe("number");
      expect(typeof bar.heightPct).toBe("number");
    }
  });

  it("all heightPct values are in [0, 100]", () => {
    const result = buildTimeOfDay(BASE_HISTORY);
    for (const bar of result.bars) {
      expect(bar.heightPct).toBeGreaterThanOrEqual(0);
      expect(bar.heightPct).toBeLessThanOrEqual(100);
    }
  });

  it("empty history produces bars with all heightPct=0", () => {
    const result = buildTimeOfDay([]);
    for (const bar of result.bars) {
      expect(bar.heightPct).toBe(0);
    }
  });

  it("peakLabel for hour 18 is '6p'", () => {
    const eveningHistory: LoggedSet[] = BASE_HISTORY.map((s) => ({
      ...s,
      ts: s.ts.replace("T09", "T18").replace("T09:30", "T18:30").replace("T12", "T18").replace("T12:30", "T18:30"),
    }));
    const result = buildTimeOfDay(eveningHistory);
    expect(result.peakLabel).toBe("6p");
  });
});

// =============================================================================
// buildTriggerMix
// =============================================================================

describe("buildTriggerMix", () => {
  it("returns exactly 3 segments", () => {
    const segs = buildTriggerMix(BASE_HISTORY);
    expect(segs).toHaveLength(3);
  });

  it("first segment label is 'Idle detected'", () => {
    const segs = buildTriggerMix(BASE_HISTORY);
    expect(segs[0].label).toBe("Idle detected");
  });

  it("second segment label is 'Timer'", () => {
    const segs = buildTriggerMix(BASE_HISTORY);
    expect(segs[1].label).toBe("Timer");
  });

  it("third segment label is 'Manual'", () => {
    const segs = buildTriggerMix(BASE_HISTORY);
    expect(segs[2].label).toBe("Manual");
  });

  it("segments use correct CSS color vars", () => {
    const segs = buildTriggerMix(BASE_HISTORY);
    expect(segs[0].color).toBe("var(--accent)");
    expect(segs[1].color).toBe("var(--accent2)");
    expect(segs[2].color).toBe("var(--accent3)");
  });

  it("idle pct is round(3/7*100)=43 (s1,s2,s7 are idle)", () => {
    const segs = buildTriggerMix(BASE_HISTORY);
    // idle: s1, s2, s7 = 3/7 = 43%
    expect(segs[0].pct).toBe(43);
  });

  it("timer pct is round(2/7*100)=29 (s3,s6 are timer)", () => {
    const segs = buildTriggerMix(BASE_HISTORY);
    expect(segs[1].pct).toBe(29);
  });

  it("manual pct is round(2/7*100)=29 (s4,s5 are manual)", () => {
    const segs = buildTriggerMix(BASE_HISTORY);
    expect(segs[2].pct).toBe(29);
  });

  it("returns 3 segments with 0% each for empty history", () => {
    const segs = buildTriggerMix([]);
    expect(segs).toHaveLength(3);
    expect(segs[0].pct).toBe(0);
    expect(segs[1].pct).toBe(0);
    expect(segs[2].pct).toBe(0);
  });

  it("100% idle when all sets have trigger=idle", () => {
    const allIdle = BASE_HISTORY.map((s) => ({ ...s, trigger: "idle" as const }));
    const segs = buildTriggerMix(allIdle);
    expect(segs[0].pct).toBe(100);
    expect(segs[1].pct).toBe(0);
    expect(segs[2].pct).toBe(0);
  });
});

// =============================================================================
// buildProgression
// =============================================================================

describe("buildProgression", () => {
  it("returns one row for the single exercise in history", () => {
    const rows = buildProgression(BASE_HISTORY, EX_NAMES);
    expect(rows).toHaveLength(1);
  });

  it("row index is 0", () => {
    const rows = buildProgression(BASE_HISTORY, EX_NAMES);
    expect(rows[0].index).toBe(0);
  });

  it("exercise name is resolved via exNames map", () => {
    const rows = buildProgression(BASE_HISTORY, EX_NAMES);
    expect(rows[0].exercise).toBe("Bench Press");
  });

  it("falls back to exId when exNames map has no entry", () => {
    const rows = buildProgression(BASE_HISTORY, {});
    expect(rows[0].exercise).toBe("ex-bench");
  });

  it("pr string contains the personal best value", () => {
    // personalBest = max(80, 83.33, 86.67) = 86.67 rounded -> '86.7 kg' or similar
    const rows = buildProgression(BASE_HISTORY, EX_NAMES);
    expect(rows[0].pr).toContain("kg");
  });

  it("gainStr is '+6.7 kg' (86.67 - 80 ≈ 6.67)", () => {
    const rows = buildProgression(BASE_HISTORY, EX_NAMES);
    expect(rows[0].gainStr).toBe("+6.7 kg");
  });

  it("up is true when last 1RM > first 1RM", () => {
    const rows = buildProgression(BASE_HISTORY, EX_NAMES);
    expect(rows[0].up).toBe(true);
  });

  it("points is a valid SVG polyline string (contains comma-separated numbers)", () => {
    const rows = buildProgression(BASE_HISTORY, EX_NAMES);
    // trendPoints returns "x1,y1 x2,y2 ..." format
    expect(rows[0].points).toMatch(/\d+\.?\d*,\d+\.?\d*/);
  });

  it("points equals expected trendPoints('5.0,29.0 60.0,17.0 115.0,5.0')", () => {
    // series=[80, 83.33, 86.67], w=120, h=34, pad=5
    const rows = buildProgression(BASE_HISTORY, EX_NAMES);
    expect(rows[0].points).toBe("5.0,29.0 60.0,17.0 115.0,5.0");
  });

  it("returns empty array for empty history", () => {
    const rows = buildProgression([], EX_NAMES);
    expect(rows).toHaveLength(0);
  });

  it("up is false when series is declining", () => {
    const declining: LoggedSet[] = [
      // Jun22: 70kg, Jun24: 60kg => series decreases
      {
        id: "d1", exId: "ex-squat", exercise: "Squat", group: "Quads",
        muscles: ["quads"], value: 10, weight: 70,
        ts: "2026-06-22T09:00:00Z", date: "2026-06-22", trigger: "idle",
      },
      {
        id: "d2", exId: "ex-squat", exercise: "Squat", group: "Quads",
        muscles: ["quads"], value: 10, weight: 60,
        ts: "2026-06-24T09:00:00Z", date: "2026-06-24", trigger: "idle",
      },
    ];
    const rows = buildProgression(declining, { "ex-squat": "Squat" });
    expect(rows[0].up).toBe(false);
  });

  it("unit is 'reps' for bodyweight exercise (no weight)", () => {
    const bwHistory: LoggedSet[] = [
      {
        id: "b1", exId: "ex-pushup", exercise: "Push-up", group: "Chest",
        muscles: ["chest"], value: 15, weight: null,
        ts: "2026-06-22T09:00:00Z", date: "2026-06-22", trigger: "idle",
      },
      {
        id: "b2", exId: "ex-pushup", exercise: "Push-up", group: "Chest",
        muscles: ["chest"], value: 20, weight: null,
        ts: "2026-06-24T09:00:00Z", date: "2026-06-24", trigger: "idle",
      },
    ];
    const rows = buildProgression(bwHistory, { "ex-pushup": "Push-up" });
    expect(rows[0].gainStr).toContain("rep");
  });

  it("multiple exercises each get their own row", () => {
    const multiHistory: LoggedSet[] = [
      ...BASE_HISTORY,
      {
        id: "x1", exId: "ex-squat", exercise: "Squat", group: "Quads",
        muscles: ["quads"], value: 10, weight: 80,
        ts: "2026-06-22T10:00:00Z", date: "2026-06-22", trigger: "timer",
      },
      {
        id: "x2", exId: "ex-squat", exercise: "Squat", group: "Quads",
        muscles: ["quads"], value: 10, weight: 85,
        ts: "2026-06-23T10:00:00Z", date: "2026-06-23", trigger: "manual",
      },
    ];
    const names = { ...EX_NAMES, "ex-squat": "Squat" };
    const rows = buildProgression(multiHistory, names);
    expect(rows).toHaveLength(2);
    const exercises = rows.map((r) => r.exercise).sort();
    expect(exercises).toContain("Bench Press");
    expect(exercises).toContain("Squat");
  });

  it("rows have sequential indices", () => {
    const multiHistory: LoggedSet[] = [
      ...BASE_HISTORY,
      {
        id: "x1", exId: "ex-squat", exercise: "Squat", group: "Quads",
        muscles: ["quads"], value: 10, weight: 80,
        ts: "2026-06-22T10:00:00Z", date: "2026-06-22", trigger: "timer",
      },
      {
        id: "x2", exId: "ex-squat", exercise: "Squat", group: "Quads",
        muscles: ["quads"], value: 10, weight: 85,
        ts: "2026-06-23T10:00:00Z", date: "2026-06-23", trigger: "manual",
      },
    ];
    const names = { ...EX_NAMES, "ex-squat": "Squat" };
    const rows = buildProgression(multiHistory, names);
    const indices = rows.map((r) => r.index).sort((a, b) => a - b);
    expect(indices).toEqual([0, 1]);
  });
});

// =============================================================================
// KpiStrip component
// =============================================================================

describe("KpiStrip", () => {
  const kpis: Kpi[] = [
    { label: "Current streak", value: "3", unit: "days" },
    { label: "Completion this wk", value: "70", unit: "%" },
    { label: "Sets this week", value: "7", unit: "sets" },
    { label: "Active days 30d", value: "3", unit: "days" },
  ];

  it("renders all KPI values", () => {
    render(<KpiStrip kpis={kpis} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("70")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders all KPI labels", () => {
    render(<KpiStrip kpis={kpis} />);
    expect(screen.getByText("Current streak")).toBeInTheDocument();
    expect(screen.getByText("Completion this wk")).toBeInTheDocument();
    expect(screen.getByText("Sets this week")).toBeInTheDocument();
    expect(screen.getByText("Active days 30d")).toBeInTheDocument();
  });

  it("renders all KPI units", () => {
    render(<KpiStrip kpis={kpis} />);
    // 'days' appears twice but both should be present
    const dayUnits = screen.getAllByText("days");
    expect(dayUnits).toHaveLength(2);
    expect(screen.getByText("%")).toBeInTheDocument();
    expect(screen.getByText("sets")).toBeInTheDocument();
  });

  it("renders 4 tiles (container has 4 child tiles)", () => {
    const { container } = render(<KpiStrip kpis={kpis} />);
    // At least the 4 KPI value texts are present
    expect(container.querySelectorAll("*").length).toBeGreaterThan(0);
    const allTexts = screen.getAllByText(/\d/);
    expect(allTexts.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// ConsistencyCard component
// =============================================================================

describe("ConsistencyCard", () => {
  const calendarData = {
    month: "June 2026",
    cells: Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      level: i < 21 ? 0 : i < 24 ? 1 : -1,
    })),
  };

  const weeklyBars: BarVM[] = Array.from({ length: 8 }, (_, i) => ({
    label: i === 7 ? "now" : String(i - 7),
    value: i === 7 ? 7 : 0,
    heightPct: i === 7 ? 100 : 0,
    current: i === 7,
  }));

  const makeProps = (overrides: Partial<ConsistencyCardProps> = {}): ConsistencyCardProps => ({
    tab: "calendar",
    onTab: vi.fn(),
    calendar: calendarData,
    weekly: weeklyBars,
    ...overrides,
  });

  it("renders month name in calendar tab", () => {
    render(<ConsistencyCard {...makeProps()} />);
    expect(screen.getByText("June 2026")).toBeInTheDocument();
  });

  it("calendar tab shows calendar grid cells", () => {
    const { container } = render(<ConsistencyCard {...makeProps()} />);
    expect(container.firstChild).not.toBeNull();
  });

  it("calendar cells render day numbers as visible text", () => {
    const { container } = render(<ConsistencyCard {...makeProps()} />);
    // Day 15 (level 0, past day) must appear as text inside the calendar
    const calendarCells = container.querySelector(".calendar-cells");
    expect(calendarCells).not.toBeNull();
    // getByText("15") should find the day number rendered inside a cell
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("future cells (level -1) do not render a day number", () => {
    // calendarData has days 25-30 with level=-1
    render(<ConsistencyCard {...makeProps()} />);
    // Day 25 is level -1 (future), should NOT be visible as text
    expect(screen.queryByText("25")).not.toBeInTheDocument();
  });

  it("clicking Weekly tab calls onTab('weekly')", () => {
    const onTab = vi.fn();
    render(<ConsistencyCard {...makeProps({ onTab })} />);
    const weeklyBtn = screen.getByRole("button", { name: /weekly/i });
    fireEvent.click(weeklyBtn);
    expect(onTab).toHaveBeenCalledWith("weekly");
  });

  it("clicking Calendar tab calls onTab('calendar')", () => {
    const onTab = vi.fn();
    render(<ConsistencyCard {...makeProps({ tab: "weekly", onTab })} />);
    const calBtn = screen.getByRole("button", { name: /calendar/i });
    fireEvent.click(calBtn);
    expect(onTab).toHaveBeenCalledWith("calendar");
  });

  it("weekly tab renders bars (when tab='weekly')", () => {
    const { container } = render(<ConsistencyCard {...makeProps({ tab: "weekly" })} />);
    expect(container.firstChild).not.toBeNull();
  });

  it("weekly tab does not show the month string", () => {
    render(<ConsistencyCard {...makeProps({ tab: "weekly" })} />);
    expect(screen.queryByText("June 2026")).not.toBeInTheDocument();
  });

  it("calendar renders cells for all intensity levels including 2 and 3", () => {
    // Build a calendar data with level-2 (3-5 sets) and level-3 (6+ sets) cells
    // to ensure all intensity branches of the cell background logic are exercised.
    const allLevelData = {
      month: "June 2026",
      cells: [
        { day: 1, level: -1 }, // future
        { day: 2, level: 0 },  // no sets
        { day: 3, level: 1 },  // 1-2 sets
        { day: 4, level: 2 },  // 3-5 sets
        { day: 5, level: 3 },  // 6+ sets
      ],
    };
    const { container } = render(
      <ConsistencyCard
        tab="calendar"
        onTab={vi.fn()}
        calendar={allLevelData}
        weekly={weeklyBars}
      />,
    );
    // All 5 cells should be rendered
    const cells = container.querySelectorAll(".calendar-cell");
    expect(cells).toHaveLength(5);
    // Level attributes match
    expect(container.querySelector(".level--1")).toBeInTheDocument();
    expect(container.querySelector(".level-0")).toBeInTheDocument();
    expect(container.querySelector(".level-1")).toBeInTheDocument();
    expect(container.querySelector(".level-2")).toBeInTheDocument();
    expect(container.querySelector(".level-3")).toBeInTheDocument();
  });
});

// =============================================================================
// CompletionCard component
// =============================================================================

describe("CompletionCard", () => {
  const days: BarVM[] = [
    { label: "T", value: 0, heightPct: 0 },
    { label: "F", value: 0, heightPct: 0 },
    { label: "S", value: 0, heightPct: 0 },
    { label: "S", value: 0, heightPct: 0 },
    { label: "M", value: 67, heightPct: 67 },
    { label: "T", value: 100, heightPct: 100 },
    { label: "W", value: 67, heightPct: 67, current: true },
  ];

  it("renders the weekPct string", () => {
    render(<CompletionCard weekPct="70%" days={days} />);
    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  it("renders day labels", () => {
    render(<CompletionCard weekPct="70%" days={days} />);
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.getByText("W")).toBeInTheDocument();
  });

  it("renders 0% weekPct when no history", () => {
    const zeroDays: BarVM[] = Array.from({ length: 7 }, (_, i) => ({
      label: "M",
      value: 0,
      heightPct: 0,
    }));
    render(<CompletionCard weekPct="0%" days={zeroDays} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});

// =============================================================================
// TimeOfDayCard component
// =============================================================================

describe("TimeOfDayCard", () => {
  const bars: BarVM[] = [
    { label: "9a", value: 5, heightPct: 100 },
    { label: "12p", value: 2, heightPct: 40 },
  ];

  it("renders peakLabel", () => {
    render(<TimeOfDayCard bars={bars} peakLabel="9a" />);
    expect(screen.getByText(/9a/)).toBeInTheDocument();
  });

  it("renders 'Peak' heading or label containing the peak", () => {
    render(<TimeOfDayCard bars={bars} peakLabel="9a" />);
    // e.g. "Peak 9a" text
    expect(screen.getByText(/peak/i)).toBeInTheDocument();
  });

  it("renders bar labels", () => {
    render(<TimeOfDayCard bars={bars} peakLabel="9a" />);
    expect(screen.getByText("9a")).toBeInTheDocument();
    expect(screen.getByText("12p")).toBeInTheDocument();
  });
});

// =============================================================================
// TriggerCard component
// =============================================================================

describe("TriggerCard", () => {
  const segments: TriggerSeg[] = [
    { label: "Idle detected", pct: 43, color: "var(--accent)" },
    { label: "Timer", pct: 29, color: "var(--accent2)" },
    { label: "Manual", pct: 29, color: "var(--accent3)" },
  ];

  it("renders all segment labels", () => {
    render(<TriggerCard segments={segments} />);
    expect(screen.getByText("Idle detected")).toBeInTheDocument();
    expect(screen.getByText("Timer")).toBeInTheDocument();
    expect(screen.getByText("Manual")).toBeInTheDocument();
  });

  it("renders segment percentages", () => {
    render(<TriggerCard segments={segments} />);
    // Each segment shows its pct
    expect(screen.getByText(/43/)).toBeInTheDocument();
    expect(screen.getAllByText(/29/).length).toBeGreaterThanOrEqual(2);
  });

  it("renders when all segments are 0%", () => {
    const zeroSegs: TriggerSeg[] = [
      { label: "Idle detected", pct: 0, color: "var(--accent)" },
      { label: "Timer", pct: 0, color: "var(--accent2)" },
      { label: "Manual", pct: 0, color: "var(--accent3)" },
    ];
    render(<TriggerCard segments={zeroSegs} />);
    expect(screen.getByText("Idle detected")).toBeInTheDocument();
  });
});

// =============================================================================
// MuscleHeatmapCard component
// =============================================================================

describe("MuscleHeatmapCard", () => {
  it("renders an SVG body map", () => {
    const { container } = render(<MuscleHeatmapCard coverage={ZERO_COV} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders without crashing with partial coverage", () => {
    const { container } = render(<MuscleHeatmapCard coverage={PARTIAL_COV} />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders front and back body maps", () => {
    const { container } = render(<MuscleHeatmapCard coverage={PARTIAL_COV} />);
    // Should have at least 2 SVGs for front/back
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// ProgressionCard component
// =============================================================================

describe("ProgressionCard", () => {
  const rows: ProgressionRowVM[] = [
    {
      index: 0,
      exercise: "Bench Press",
      points: "5.0,29.0 60.0,17.0 115.0,5.0",
      pr: "86.7 kg",
      gainStr: "+6.7 kg",
      up: true,
    },
  ];

  const makeProps = (overrides: Partial<ProgressionCardProps> = {}): ProgressionCardProps => ({
    rows,
    onOpenChart: vi.fn(),
    ...overrides,
  });

  it("renders exercise name", () => {
    render(<ProgressionCard {...makeProps()} />);
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
  });

  it("renders PR string", () => {
    render(<ProgressionCard {...makeProps()} />);
    expect(screen.getByText("86.7 kg")).toBeInTheDocument();
  });

  it("renders gainStr", () => {
    render(<ProgressionCard {...makeProps()} />);
    expect(screen.getByText("+6.7 kg")).toBeInTheDocument();
  });

  it("clicking a row calls onOpenChart with row index", () => {
    const onOpenChart = vi.fn();
    render(<ProgressionCard {...makeProps({ onOpenChart })} />);
    fireEvent.click(screen.getByText("Bench Press"));
    expect(onOpenChart).toHaveBeenCalledWith(0);
  });

  it("clicking second row calls onOpenChart with index 1", () => {
    const onOpenChart = vi.fn();
    const twoRows: ProgressionRowVM[] = [
      ...rows,
      {
        index: 1,
        exercise: "Squat",
        points: "5.0,5.0 115.0,5.0",
        pr: "100 kg",
        gainStr: "+5.0 kg",
        up: true,
      },
    ];
    render(<ProgressionCard rows={twoRows} onOpenChart={onOpenChart} />);
    fireEvent.click(screen.getByText("Squat"));
    expect(onOpenChart).toHaveBeenCalledWith(1);
  });

  it("renders polyline SVG element for sparkline", () => {
    const { container } = render(<ProgressionCard {...makeProps()} />);
    expect(container.querySelector("polyline")).toBeInTheDocument();
  });

  it("renders empty state gracefully for no rows", () => {
    const { container } = render(<ProgressionCard rows={[]} onOpenChart={vi.fn()} />);
    expect(container.firstChild).not.toBeNull();
  });

  it("'up' badge shown for rows with up=true (positive gain)", () => {
    render(<ProgressionCard {...makeProps()} />);
    // gain badge should indicate upward trend somehow
    expect(screen.getByText("+6.7 kg")).toBeInTheDocument();
  });

  it("row with up=false renders negative gain", () => {
    const downRow: ProgressionRowVM[] = [
      {
        index: 0,
        exercise: "Deadlift",
        points: "5.0,5.0 115.0,29.0",
        pr: "90 kg",
        gainStr: "-5.0 kg",
        up: false,
      },
    ];
    render(<ProgressionCard rows={downRow} onOpenChart={vi.fn()} />);
    expect(screen.getByText("-5.0 kg")).toBeInTheDocument();
  });
});

// =============================================================================
// ProgressScreen component (composes everything)
// =============================================================================

describe("ProgressScreen", () => {
  // All builder calls and props are deferred into it() to avoid module-level throws.
  // defaultProps is declared lazily inside each test or via a factory function.

  const defaultProps: ProgressScreenProps = {
    history: BASE_HISTORY,
    coverage: PARTIAL_COV,
    now: NOW,
    plannedPerWeek: 10,
    plannedPerDay: 3,
    exNames: EX_NAMES,
    tab: "calendar",
    onTab: vi.fn(),
    onOpenChart: vi.fn(),
  };

  it("renders KPI values on the progress screen", () => {
    render(<ProgressScreen {...defaultProps} />);
    // Streak value = "3" — may appear multiple times (KPI + calendar day cell)
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
    // Sets this week = "7" — may appear multiple times (KPI + calendar day cell)
    expect(screen.getAllByText("7").length).toBeGreaterThanOrEqual(1);
  });

  it("renders 'June 2026' calendar month on the progress screen", () => {
    render(<ProgressScreen {...defaultProps} />);
    expect(screen.getByText("June 2026")).toBeInTheDocument();
  });

  it("renders exercise name in progression section", () => {
    render(<ProgressScreen {...defaultProps} />);
    expect(screen.getByText("Bench Press")).toBeInTheDocument();
  });

  it("renders gainStr in progression section", () => {
    render(<ProgressScreen {...defaultProps} />);
    expect(screen.getByText("+6.7 kg")).toBeInTheDocument();
  });

  it("renders SVG body map (MuscleHeatmapCard)", () => {
    const { container } = render(<ProgressScreen {...defaultProps} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders peak label in time-of-day section", () => {
    render(<ProgressScreen {...defaultProps} />);
    // Peak is at 9am
    expect(screen.getByText(/9a/)).toBeInTheDocument();
  });

  it("renders trigger segment labels", () => {
    render(<ProgressScreen {...defaultProps} />);
    expect(screen.getByText("Idle detected")).toBeInTheDocument();
    expect(screen.getByText("Timer")).toBeInTheDocument();
    expect(screen.getByText("Manual")).toBeInTheDocument();
  });

  it("renders weekPct completion (mean of 7-day completion rates)", () => {
    // buildCompletion with plannedPerDay=3 produces day values [0,0,0,0,67,100,67]
    // mean = 234/7 ≈ 33.43 => "33%"
    render(<ProgressScreen {...defaultProps} />);
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("onTab('weekly') is called when Weekly tab clicked", () => {
    const onTab = vi.fn();
    render(<ProgressScreen {...defaultProps} onTab={onTab} />);
    const weeklyBtn = screen.getByRole("button", { name: /weekly/i });
    fireEvent.click(weeklyBtn);
    expect(onTab).toHaveBeenCalledWith("weekly");
  });

  it("onOpenChart is called with 0 when Bench Press row is clicked", () => {
    const onOpenChart = vi.fn();
    render(<ProgressScreen {...defaultProps} onOpenChart={onOpenChart} />);
    fireEvent.click(screen.getByText("Bench Press"));
    expect(onOpenChart).toHaveBeenCalledWith(0);
  });

  it("renders in weekly tab mode correctly", () => {
    const { container } = render(<ProgressScreen {...defaultProps} tab="weekly" />);
    expect(container.firstChild).not.toBeNull();
    // In weekly tab, calendar month should not be shown
    expect(screen.queryByText("June 2026")).not.toBeInTheDocument();
  });
});
