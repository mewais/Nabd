/**
 * B08 · @nabd/analytics — Vitest test suite
 *
 * Every exported function is called with synthetic LoggedSet[] fixtures and a
 * fixed `now: Date` so the suite is fully deterministic (no Date.now()).
 *
 * All tests are RED against the skeleton (which throws "not implemented") while
 * achieving 100% line/function coverage of src/index.ts.
 *
 * Tests assert concrete expected values — NOT that the functions throw.
 */

import { describe, it, expect } from "vitest";
import {
  streak,
  setsThisWeek,
  completionThisWeek,
  activeDays30,
  timeOfDay,
  triggerMix,
  calendarHeatmap,
  weeklyBars,
  completionLast7,
  type HourBucket,
  type CalendarCell,
} from "@nabd/analytics";
import type { LoggedSet, Trigger } from "@nabd/domain";

// ---------------------------------------------------------------------------
// Minimal LoggedSet factory
// ---------------------------------------------------------------------------
let _idCounter = 0;
function makeSet(
  date: string,
  tsIso: string,
  trigger: Trigger = "manual",
  overrides: Partial<LoggedSet> = {},
): LoggedSet {
  return {
    id: `set-${++_idCounter}`,
    exId: "ex-squat",
    exercise: "Squat",
    group: "Legs",
    muscles: ["quads"],
    value: 10,
    weight: 80,
    ts: tsIso,
    date,
    trigger,
    ...overrides,
  };
}

/** Build N sets on a given date, all at the given hour (00-23). */
function makeSets(date: string, hour: number, count: number, trigger: Trigger = "manual"): LoggedSet[] {
  return Array.from({ length: count }, (_, i) => {
    const hh = String(hour).padStart(2, "0");
    const mm = String(i).padStart(2, "0");
    return makeSet(date, `${date}T${hh}:${mm}:00.000Z`, trigger);
  });
}

// ===========================================================================
// streak
// ===========================================================================
describe("streak — consecutive days including today", () => {
  it("returns 3 for three consecutive days ending today", () => {
    // now = 2024-03-15 (Friday)
    const now = new Date("2024-03-15T12:00:00.000Z");
    const history: LoggedSet[] = [
      ...makeSets("2024-03-13", 9, 1),
      ...makeSets("2024-03-14", 10, 2),
      ...makeSets("2024-03-15", 11, 1),
    ];
    expect(streak(history, now)).toBe(3);
  });

  it("returns 1 when only today has a set", () => {
    const now = new Date("2024-03-15T12:00:00.000Z");
    const history = makeSets("2024-03-15", 9, 1);
    expect(streak(history, now)).toBe(1);
  });
});

describe("streak — gap breaks the streak", () => {
  it("returns 1 when yesterday is missing (only today)", () => {
    // today: 15, gap on 14, sets on 13
    const now = new Date("2024-03-15T12:00:00.000Z");
    const history: LoggedSet[] = [
      ...makeSets("2024-03-13", 9, 1),
      ...makeSets("2024-03-15", 11, 1),
    ];
    expect(streak(history, now)).toBe(1);
  });

  it("stops counting at the gap even when older days have sets", () => {
    const now = new Date("2024-03-15T12:00:00.000Z");
    const history: LoggedSet[] = [
      ...makeSets("2024-03-10", 9, 3),
      ...makeSets("2024-03-11", 9, 2),
      // 12 & 13 & 14 missing — gap
      ...makeSets("2024-03-15", 11, 1),
    ];
    expect(streak(history, now)).toBe(1);
  });
});

describe("streak — empty history", () => {
  it("returns 0 for empty history", () => {
    const now = new Date("2024-03-15T12:00:00.000Z");
    expect(streak([], now)).toBe(0);
  });
});

describe("streak — counts from yesterday when today is empty", () => {
  it("returns 2 when yesterday and day-before have sets but today is empty", () => {
    const now = new Date("2024-03-15T12:00:00.000Z");
    const history: LoggedSet[] = [
      ...makeSets("2024-03-13", 9, 1),
      ...makeSets("2024-03-14", 10, 2),
    ];
    expect(streak(history, now)).toBe(2);
  });

  it("returns 1 when only yesterday has a set", () => {
    const now = new Date("2024-03-15T12:00:00.000Z");
    const history = makeSets("2024-03-14", 10, 1);
    expect(streak(history, now)).toBe(1);
  });
});

// ===========================================================================
// setsThisWeek
// ===========================================================================
describe("setsThisWeek — counts sets in current Mon–Sun week", () => {
  // now = 2024-03-13 (Wednesday of week Mon 11 – Sun 17)
  const now = new Date("2024-03-13T12:00:00.000Z");

  it("counts sets from Monday through now (Wednesday)", () => {
    const history: LoggedSet[] = [
      ...makeSets("2024-03-11", 8, 2), // Monday
      ...makeSets("2024-03-12", 9, 3), // Tuesday
      ...makeSets("2024-03-13", 10, 1), // Wednesday (today)
    ];
    expect(setsThisWeek(history, now)).toBe(6);
  });

  it("excludes sets from the previous week (before Monday)", () => {
    const history: LoggedSet[] = [
      ...makeSets("2024-03-10", 8, 5), // Sunday of PREVIOUS week
      ...makeSets("2024-03-11", 9, 2), // Monday this week
    ];
    expect(setsThisWeek(history, now)).toBe(2);
  });

  it("includes sets through Sunday of the current week", () => {
    const history: LoggedSet[] = [
      ...makeSets("2024-03-11", 8, 1), // Monday
      ...makeSets("2024-03-17", 20, 4), // Sunday (still this week)
    ];
    expect(setsThisWeek(history, now)).toBe(5);
  });

  it("excludes sets from next week (after Sunday)", () => {
    const history: LoggedSet[] = [
      ...makeSets("2024-03-11", 8, 2), // Monday this week
      ...makeSets("2024-03-18", 9, 3), // Monday next week
    ];
    expect(setsThisWeek(history, now)).toBe(2);
  });

  it("returns 0 for empty history", () => {
    expect(setsThisWeek([], now)).toBe(0);
  });

  it("returns 0 when no sets fall in current week", () => {
    const history = makeSets("2024-03-01", 8, 5); // previous week entirely
    expect(setsThisWeek(history, now)).toBe(0);
  });
});

describe("setsThisWeek — boundary: now is Monday", () => {
  it("counts only sets on that Monday", () => {
    const now = new Date("2024-03-11T08:00:00.000Z"); // Monday
    const history: LoggedSet[] = [
      ...makeSets("2024-03-10", 9, 3), // Sunday prior week
      ...makeSets("2024-03-11", 10, 2), // Monday this week
    ];
    expect(setsThisWeek(history, now)).toBe(2);
  });
});

describe("setsThisWeek — boundary: now is Sunday", () => {
  it("includes all sets Mon through Sun", () => {
    const now = new Date("2024-03-17T20:00:00.000Z"); // Sunday
    const history: LoggedSet[] = [
      ...makeSets("2024-03-11", 8, 1),
      ...makeSets("2024-03-12", 9, 2),
      ...makeSets("2024-03-13", 10, 3),
      ...makeSets("2024-03-14", 11, 1),
      ...makeSets("2024-03-15", 12, 2),
      ...makeSets("2024-03-16", 13, 1),
      ...makeSets("2024-03-17", 20, 4),
    ];
    expect(setsThisWeek(history, now)).toBe(14);
  });
});

// ===========================================================================
// completionThisWeek
// ===========================================================================
describe("completionThisWeek — ratio and clamp", () => {
  const now = new Date("2024-03-13T12:00:00.000Z");

  it("returns 50 when setsThisWeek is half of plannedPerWeek", () => {
    // 5 sets done, 10 planned → 50%
    const history = makeSets("2024-03-11", 8, 5);
    expect(completionThisWeek(history, 10, now)).toBe(50);
  });

  it("returns 100 when setsThisWeek equals plannedPerWeek", () => {
    const history = makeSets("2024-03-11", 8, 10);
    expect(completionThisWeek(history, 10, now)).toBe(100);
  });

  it("clamps to 100 when setsThisWeek exceeds plannedPerWeek", () => {
    const history = makeSets("2024-03-11", 8, 15);
    expect(completionThisWeek(history, 10, now)).toBe(100);
  });

  it("returns 0 when plannedPerWeek is 0", () => {
    const history = makeSets("2024-03-11", 8, 5);
    expect(completionThisWeek(history, 0, now)).toBe(0);
  });

  it("returns 0 when no sets this week", () => {
    expect(completionThisWeek([], 10, now)).toBe(0);
  });

  it("rounds 33.33... to 33", () => {
    // 1 set of 3 planned → 33.33 → round to 33
    const history = makeSets("2024-03-11", 8, 1);
    expect(completionThisWeek(history, 3, now)).toBe(33);
  });

  it("rounds 66.66... to 67", () => {
    // 2 sets of 3 planned → 66.66 → round to 67
    const history = makeSets("2024-03-11", 8, 2);
    expect(completionThisWeek(history, 3, now)).toBe(67);
  });
});

// ===========================================================================
// activeDays30
// ===========================================================================
describe("activeDays30 — distinct active days in last 30 days", () => {
  // now = 2024-03-15 → last 30 days = 2024-02-14 .. 2024-03-15
  const now = new Date("2024-03-15T12:00:00.000Z");

  it("counts each distinct date with at least 1 set", () => {
    const history: LoggedSet[] = [
      ...makeSets("2024-03-13", 9, 3),
      ...makeSets("2024-03-14", 10, 1),
      ...makeSets("2024-03-15", 11, 5),
    ];
    // 3 distinct dates
    expect(activeDays30(history, now)).toBe(3);
  });

  it("multiple sets on the same day count as 1 active day", () => {
    const history = makeSets("2024-03-15", 9, 7);
    expect(activeDays30(history, now)).toBe(1);
  });

  it("excludes sets older than 30 days", () => {
    const history: LoggedSet[] = [
      ...makeSets("2024-02-13", 9, 2), // 31 days ago — outside window
      ...makeSets("2024-02-14", 10, 1), // exactly 30 days ago — inside
      ...makeSets("2024-03-15", 11, 3),
    ];
    expect(activeDays30(history, now)).toBe(2);
  });

  it("returns 0 for empty history", () => {
    expect(activeDays30([], now)).toBe(0);
  });

  it("returns 0 when all sets are older than 30 days", () => {
    const history = makeSets("2024-01-01", 9, 5);
    expect(activeDays30(history, now)).toBe(0);
  });

  it("includes today in the 30-day window", () => {
    const history = makeSets("2024-03-15", 9, 2);
    expect(activeDays30(history, now)).toBe(1);
  });
});

describe("activeDays30 — boundary at 30-day edge", () => {
  it("boundary day 30 is included", () => {
    // now = 2024-03-15; 30 days before = 2024-02-14
    const now = new Date("2024-03-15T00:00:00.000Z");
    const history: LoggedSet[] = [
      makeSet("2024-02-14", "2024-02-14T08:00:00.000Z"), // edge day — included
    ];
    expect(activeDays30(history, now)).toBe(1);
  });

  it("day 31 ago is excluded", () => {
    const now = new Date("2024-03-15T00:00:00.000Z");
    const history: LoggedSet[] = [
      makeSet("2024-02-13", "2024-02-13T08:00:00.000Z"), // 31 days before — excluded
    ];
    expect(activeDays30(history, now)).toBe(0);
  });
});

// ===========================================================================
// timeOfDay
// ===========================================================================
describe("timeOfDay — 24-bucket histogram", () => {
  it("returns exactly 24 buckets with hours 0–23", () => {
    const history = makeSets("2024-03-15", 10, 1);
    const { buckets } = timeOfDay(history);
    expect(buckets).toHaveLength(24);
    expect(buckets.map((b: HourBucket) => b.hour)).toEqual(
      Array.from({ length: 24 }, (_, i) => i),
    );
  });

  it("counts sets in the correct hour bucket", () => {
    // ts at 14:xx → hour 14
    const h = [
      makeSet("2024-03-15", "2024-03-15T14:00:00.000Z"),
      makeSet("2024-03-15", "2024-03-15T14:30:00.000Z"),
      makeSet("2024-03-15", "2024-03-15T09:00:00.000Z"),
    ];
    const { buckets } = timeOfDay(h);
    expect(buckets[14].count).toBe(2);
    expect(buckets[9].count).toBe(1);
    expect(buckets[0].count).toBe(0);
  });

  it("all buckets are 0 for empty history", () => {
    const { buckets } = timeOfDay([]);
    expect(buckets.every((b: HourBucket) => b.count === 0)).toBe(true);
  });
});

describe("timeOfDay — peak hour", () => {
  it("returns the hour with the highest count as peak", () => {
    const h = [
      makeSet("2024-03-15", "2024-03-15T07:00:00.000Z"),
      makeSet("2024-03-15", "2024-03-15T07:30:00.000Z"),
      makeSet("2024-03-15", "2024-03-15T07:45:00.000Z"),
      makeSet("2024-03-15", "2024-03-15T14:00:00.000Z"),
    ];
    const { peak } = timeOfDay(h);
    expect(peak).toBe(7);
  });

  it("on tie returns the lowest hour", () => {
    // hour 10 count 2, hour 18 count 2 — tie → lowest = 10
    const h = [
      makeSet("2024-03-15", "2024-03-15T10:00:00.000Z"),
      makeSet("2024-03-15", "2024-03-15T10:30:00.000Z"),
      makeSet("2024-03-15", "2024-03-15T18:00:00.000Z"),
      makeSet("2024-03-15", "2024-03-15T18:30:00.000Z"),
    ];
    const { peak } = timeOfDay(h);
    expect(peak).toBe(10);
  });

  it("returns peak 0 for empty history", () => {
    const { peak } = timeOfDay([]);
    expect(peak).toBe(0);
  });

  it("returns correct peak when only one hour has sets", () => {
    const h = makeSets("2024-03-15", 6, 3);
    const { peak } = timeOfDay(h);
    expect(peak).toBe(6);
  });
});

// ===========================================================================
// triggerMix
// ===========================================================================
describe("triggerMix — percentage split", () => {
  it("returns all 0 for empty history", () => {
    const result = triggerMix([]);
    expect(result.idle).toBe(0);
    expect(result.timer).toBe(0);
    expect(result.manual).toBe(0);
  });

  it("returns 100 for the only trigger present", () => {
    const h = [
      makeSet("2024-03-15", "2024-03-15T09:00:00.000Z", "manual"),
      makeSet("2024-03-15", "2024-03-15T10:00:00.000Z", "manual"),
    ];
    const result = triggerMix(h);
    expect(result.manual).toBe(100);
    expect(result.idle).toBe(0);
    expect(result.timer).toBe(0);
  });

  it("splits 50/50 between two equal triggers", () => {
    const h = [
      makeSet("2024-03-15", "2024-03-15T09:00:00.000Z", "idle"),
      makeSet("2024-03-15", "2024-03-15T10:00:00.000Z", "timer"),
    ];
    const result = triggerMix(h);
    expect(result.idle).toBe(50);
    expect(result.timer).toBe(50);
    expect(result.manual).toBe(0);
  });

  it("splits three triggers: 2 idle, 1 timer, 1 manual out of 4 → 50/25/25", () => {
    const h = [
      makeSet("2024-03-15", "2024-03-15T08:00:00.000Z", "idle"),
      makeSet("2024-03-15", "2024-03-15T09:00:00.000Z", "idle"),
      makeSet("2024-03-15", "2024-03-15T10:00:00.000Z", "timer"),
      makeSet("2024-03-15", "2024-03-15T11:00:00.000Z", "manual"),
    ];
    const result = triggerMix(h);
    expect(result.idle).toBe(50);
    expect(result.timer).toBe(25);
    expect(result.manual).toBe(25);
  });

  it("all values are non-negative", () => {
    const h = [
      makeSet("2024-03-15", "2024-03-15T09:00:00.000Z", "timer"),
      makeSet("2024-03-15", "2024-03-15T10:00:00.000Z", "manual"),
      makeSet("2024-03-15", "2024-03-15T11:00:00.000Z", "idle"),
    ];
    const result = triggerMix(h);
    expect(result.idle).toBeGreaterThanOrEqual(0);
    expect(result.timer).toBeGreaterThanOrEqual(0);
    expect(result.manual).toBeGreaterThanOrEqual(0);
  });

  it("returns a record with exactly the three Trigger keys", () => {
    const result = triggerMix([]);
    expect(Object.keys(result).sort()).toEqual(["idle", "manual", "timer"]);
  });
});

// ===========================================================================
// calendarHeatmap
// ===========================================================================
describe("calendarHeatmap — month cells for now's month", () => {
  // now = 2024-03-15 (March has 31 days)
  const now = new Date("2024-03-15T12:00:00.000Z");

  it("returns one cell per day of the month (31 for March)", () => {
    const cells = calendarHeatmap([], now);
    expect(cells).toHaveLength(31);
  });

  it("cell.day values are 1 through 31", () => {
    const cells = calendarHeatmap([], now);
    expect(cells.map((c: CalendarCell) => c.day)).toEqual(
      Array.from({ length: 31 }, (_, i) => i + 1),
    );
  });

  it("future days (after now) get level -1", () => {
    const cells = calendarHeatmap([], now);
    // days 16..31 are future
    cells.slice(15).forEach((c: CalendarCell) => {
      expect(c.level).toBe(-1);
    });
  });

  it("days in the past or today with no sets get level 0", () => {
    const cells = calendarHeatmap([], now);
    // days 1..15 have no sets — level 0
    cells.slice(0, 15).forEach((c: CalendarCell) => {
      expect(c.level).toBe(0);
    });
  });
});

describe("calendarHeatmap — intensity levels", () => {
  const now = new Date("2024-03-15T12:00:00.000Z");

  it("level 1 for 1 set (1–2)", () => {
    const h = makeSets("2024-03-10", 9, 1);
    const cells = calendarHeatmap(h, now);
    expect(cells[9].level).toBe(1); // day 10 index 9
  });

  it("level 1 for 2 sets (1–2)", () => {
    const h = makeSets("2024-03-10", 9, 2);
    const cells = calendarHeatmap(h, now);
    expect(cells[9].level).toBe(1);
  });

  it("level 2 for 3 sets (3–5)", () => {
    const h = makeSets("2024-03-10", 9, 3);
    const cells = calendarHeatmap(h, now);
    expect(cells[9].level).toBe(2);
  });

  it("level 2 for 5 sets (3–5)", () => {
    const h = makeSets("2024-03-10", 9, 5);
    const cells = calendarHeatmap(h, now);
    expect(cells[9].level).toBe(2);
  });

  it("level 3 for 6 sets (>5)", () => {
    const h = makeSets("2024-03-10", 9, 6);
    const cells = calendarHeatmap(h, now);
    expect(cells[9].level).toBe(3);
  });

  it("level 3 for many sets (>5)", () => {
    const h = makeSets("2024-03-01", 9, 10);
    const cells = calendarHeatmap(h, now);
    expect(cells[0].level).toBe(3);
  });

  it("sets from a different month do not affect this month's cells", () => {
    const h = [
      ...makeSets("2024-02-28", 9, 6), // previous month
      ...makeSets("2024-04-01", 9, 6), // next month
    ];
    const cells = calendarHeatmap(h, now);
    // all past days should be 0
    cells.slice(0, 15).forEach((c: CalendarCell) => {
      expect(c.level).toBe(0);
    });
  });

  it("today's sets count toward today's level", () => {
    const h = makeSets("2024-03-15", 9, 4);
    const cells = calendarHeatmap(h, now);
    expect(cells[14].level).toBe(2); // day 15, index 14, 4 sets → level 2
  });
});

describe("calendarHeatmap — February (28 days)", () => {
  it("returns 28 cells for a non-leap February", () => {
    const now = new Date("2024-02-15T12:00:00.000Z"); // 2024 IS leap — use 2023
    const now2023 = new Date("2023-02-15T12:00:00.000Z");
    const cells = calendarHeatmap([], now2023);
    expect(cells).toHaveLength(28);
  });

  it("returns 29 cells for a leap-year February", () => {
    const now = new Date("2024-02-15T12:00:00.000Z"); // 2024 is a leap year
    const cells = calendarHeatmap([], now);
    expect(cells).toHaveLength(29);
  });
});

// ===========================================================================
// weeklyBars
// ===========================================================================
describe("weeklyBars — 8 weekly totals oldest-first, current last", () => {
  // now = 2024-03-13 (Wednesday) → current week Mon 11–Sun 17
  const now = new Date("2024-03-13T12:00:00.000Z");

  it("always returns exactly 8 entries", () => {
    const bars = weeklyBars([], now);
    expect(bars).toHaveLength(8);
  });

  it("all zeros for empty history", () => {
    const bars = weeklyBars([], now);
    expect(bars.every((n: number) => n === 0)).toBe(true);
  });

  it("current week (index 7, last) reflects sets logged this week", () => {
    const history = makeSets("2024-03-11", 9, 4); // Monday this week
    const bars = weeklyBars(history, now);
    expect(bars[7]).toBe(4);
  });

  it("previous week (index 6) reflects sets from Mon 4–Sun 10", () => {
    const history = makeSets("2024-03-04", 9, 5); // Monday prev week
    const bars = weeklyBars(history, now);
    expect(bars[6]).toBe(5);
  });

  it("sets 8 weeks ago (index 0, oldest) are counted", () => {
    // 8 weeks back from current week: Mon 22 Jan 2024
    const history = makeSets("2024-01-22", 9, 3);
    const bars = weeklyBars(history, now);
    expect(bars[0]).toBe(3);
  });

  it("sets older than 8 weeks are excluded (not counted in any bar)", () => {
    // 9 weeks before the current week start is 2024-01-15 or earlier
    const history = makeSets("2024-01-14", 9, 10);
    const bars = weeklyBars(history, now);
    expect(bars.every((n: number) => n === 0)).toBe(true);
  });

  it("sums all sets within each week across multiple days", () => {
    const history: LoggedSet[] = [
      ...makeSets("2024-03-11", 8, 2), // Mon this week
      ...makeSets("2024-03-12", 9, 3), // Tue this week
      ...makeSets("2024-03-13", 10, 1), // Wed this week (today)
    ];
    const bars = weeklyBars(history, now);
    expect(bars[7]).toBe(6);
  });

  it("correctly separates two consecutive weeks", () => {
    const history: LoggedSet[] = [
      ...makeSets("2024-03-04", 9, 4), // prev week (index 6)
      ...makeSets("2024-03-11", 9, 7), // current week (index 7)
    ];
    const bars = weeklyBars(history, now);
    expect(bars[6]).toBe(4);
    expect(bars[7]).toBe(7);
  });

  it("entries are ordered oldest (index 0) to current (index 7)", () => {
    // 3 sets in oldest week, 5 sets in current week
    const history: LoggedSet[] = [
      ...makeSets("2024-01-22", 9, 3), // 8 weeks ago
      ...makeSets("2024-03-11", 9, 5), // current week
    ];
    const bars = weeklyBars(history, now);
    expect(bars[0]).toBe(3);
    expect(bars[7]).toBe(5);
    // all middle entries should be 0
    for (let i = 1; i <= 6; i++) {
      expect(bars[i]).toBe(0);
    }
  });
});

// ===========================================================================
// completionLast7
// ===========================================================================
describe("completionLast7 — 7-day completion oldest-first", () => {
  // now = 2024-03-15 → last 7 days = 2024-03-09..2024-03-15
  const now = new Date("2024-03-15T12:00:00.000Z");

  it("returns exactly 7 entries", () => {
    const result = completionLast7([], 3, now);
    expect(result).toHaveLength(7);
  });

  it("all zeros for empty history", () => {
    const result = completionLast7([], 3, now);
    expect(result.every((n: number) => n === 0)).toBe(true);
  });

  it("oldest day is index 0 (7 days ago = 2024-03-09)", () => {
    const h = makeSets("2024-03-09", 9, 3); // 3 sets, 3 planned → 100
    const result = completionLast7(h, 3, now);
    expect(result[0]).toBe(100);
  });

  it("most recent day is index 6 (today = 2024-03-15)", () => {
    const h = makeSets("2024-03-15", 9, 3); // 3 sets, 3 planned → 100
    const result = completionLast7(h, 3, now);
    expect(result[6]).toBe(100);
  });

  it("clamps to 100 when sets exceed plannedPerDay", () => {
    const h = makeSets("2024-03-15", 9, 10); // 10 sets, 3 planned → clamp 100
    const result = completionLast7(h, 3, now);
    expect(result[6]).toBe(100);
  });

  it("rounds 33.33 → 33", () => {
    const h = makeSets("2024-03-15", 9, 1); // 1 of 3 planned → 33.33 → 33
    const result = completionLast7(h, 3, now);
    expect(result[6]).toBe(33);
  });

  it("rounds 66.66 → 67", () => {
    const h = makeSets("2024-03-15", 9, 2); // 2 of 3 planned → 66.66 → 67
    const result = completionLast7(h, 3, now);
    expect(result[6]).toBe(67);
  });

  it("sets older than 7 days are not counted", () => {
    const h = makeSets("2024-03-08", 9, 5); // 8 days ago — excluded
    const result = completionLast7(h, 3, now);
    expect(result.every((n: number) => n === 0)).toBe(true);
  });

  it("each day uses its own set count independently", () => {
    const h: LoggedSet[] = [
      ...makeSets("2024-03-09", 9, 1), // oldest, index 0
      ...makeSets("2024-03-10", 9, 2), // index 1
      ...makeSets("2024-03-11", 9, 3), // index 2
      ...makeSets("2024-03-12", 9, 0), // index 3 — no sets → 0
      ...makeSets("2024-03-13", 9, 3), // index 4 → 100
      ...makeSets("2024-03-14", 9, 2), // index 5 → 67
      ...makeSets("2024-03-15", 9, 1), // index 6, today → 33
    ];
    const result = completionLast7(h, 3, now);
    expect(result[0]).toBe(33); // 1/3 → 33
    expect(result[1]).toBe(67); // 2/3 → 67
    expect(result[2]).toBe(100); // 3/3 → 100
    expect(result[3]).toBe(0); // 0/3 → 0
    expect(result[4]).toBe(100); // 3/3 → 100
    expect(result[5]).toBe(67); // 2/3 → 67
    expect(result[6]).toBe(33); // 1/3 → 33
  });

  it("returns all zeros when plannedPerDay is 0 (avoid divide-by-zero)", () => {
    const h = makeSets("2024-03-15", 9, 5);
    const result = completionLast7(h, 0, now);
    expect(result.every((n: number) => n === 0)).toBe(true);
  });
});
