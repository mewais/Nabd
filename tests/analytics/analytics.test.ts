import type { DayRecord, LoggedSet } from "@nabd/domain";
import { DEFAULT_SETTINGS, WEEKDAYS, dateKey } from "@nabd/domain";
import { TrainingStats } from "@nabd/analytics";
import { dayRecord, exercise, logged, nov } from "../support/builders";

const ex = exercise();
const setsOn = (day: number, count: number, hour = 10): LoggedSet[] =>
  Array.from({ length: count }, (_, i) => logged(ex, nov(day, hour, i), 10, 20));
const record = (day: number, planned: number, done: number): DayRecord =>
  dayRecord(nov(day), planned, done);

/** Every day of the week worked. */
const EVERY_DAY = WEEKDAYS;

// Monday 16 Nov 2026 is "today"; the week runs Mon 16 – Sun 22.
const stats = (history: LoggedSet[], dayLog: DayRecord[] = [], workDays = EVERY_DAY) =>
  new TrainingStats(history, dayLog, nov(16, 15), workDays);

describe("TrainingStats", () => {
  it("counts a streak ending today, or yesterday when today is still empty", () => {
    expect(stats([]).streak()).toBe(0);
    expect(stats([...setsOn(14, 1), ...setsOn(15, 1), ...setsOn(16, 1)]).streak()).toBe(3);
    expect(stats([...setsOn(14, 1), ...setsOn(15, 1)]).streak()).toBe(2);
    expect(stats([...setsOn(13, 1), ...setsOn(14, 1)]).streak()).toBe(0);
  });

  describe("a streak of workdays (Monday to Friday)", () => {
    const weekdays = (history: LoggedSet[]) =>
      stats(history, [], DEFAULT_SETTINGS.workDays).streak();
    const lastWeek = [9, 10, 11, 12, 13].flatMap((day) => setsOn(day, 1));

    it("carries over a weekend with nothing logged on it", () => {
      expect(weekdays([...lastWeek, ...setsOn(16, 1)])).toBe(6);
      // Monday not trained yet: the streak still stands at Friday's.
      expect(weekdays(lastWeek)).toBe(5);
    });

    it("is not extended by a set on a day off", () => {
      expect(weekdays([...setsOn(13, 1), ...setsOn(14, 2), ...setsOn(15, 1)])).toBe(1);
    });

    it("is broken by a workday with nothing logged, wherever the days off fall", () => {
      const missedThursday = [9, 10, 11, 13].flatMap((day) => setsOn(day, 1));
      expect(weekdays([...missedThursday, ...setsOn(16, 1)])).toBe(2);
      expect(weekdays([...setsOn(15, 1)])).toBe(0);
    });
  });

  it("counts sets in the Monday–Sunday week and active days in the last 30", () => {
    const history = [...setsOn(15, 4), ...setsOn(16, 3), ...setsOn(1, 2)];
    expect(stats(history).setsThisWeek()).toBe(3);
    expect(stats(history).activeDays()).toBe(3);
    expect(stats(setsOn(16, 1)).activeDays()).toBe(1);
  });

  it("weekly completion is done over planned, extra sets not counted, across this week's records", () => {
    expect(stats([], []).completionThisWeek()).toBe(0);
    expect(stats([], [record(15, 10, 10), record(16, 10, 5)]).completionThisWeek()).toBe(50);
    expect(stats([], [record(16, 10, 30)]).completionThisWeek()).toBe(100);
  });

  it("daily completion covers the last seven days, with rest days left blank", () => {
    const days = stats([], [record(14, 8, 4), record(16, 9, 9)]).completionByDay();
    expect(days.map((d) => d.pct)).toEqual([null, null, null, null, 50, null, 100]);
    expect(dateKey(days[0]!.date)).toBe(dateKey(nov(10)));
    expect(dateKey(days[6]!.date)).toBe(dateKey(nov(16)));
  });

  it("weekly bars cover eight weeks, oldest first, current week last", () => {
    const weeks = stats([...setsOn(16, 2), ...setsOn(12, 5), ...setsOn(2, 1)]).weeklySets();
    expect(weeks).toHaveLength(8);
    expect(weeks.map((w) => w.sets)).toEqual([0, 0, 0, 0, 0, 1, 5, 2]);
    expect(dateKey(weeks[7]!.weekStart)).toBe(dateKey(nov(16)));
    expect(dateKey(weeks[6]!.weekStart)).toBe(dateKey(nov(9)));
  });

  it("the month calendar grades each day by set count and blanks the future", () => {
    const cells = stats([...setsOn(2, 1), ...setsOn(3, 3), ...setsOn(4, 6)]).calendar();
    expect(cells).toHaveLength(30);
    expect(cells.slice(0, 4).map((c) => c.level)).toEqual(["none", "light", "medium", "full"]);
    expect(cells[15]).toEqual({ day: 16, level: "none" });
    expect(cells[16]).toEqual({ day: 17, level: "future" });
  });

  it("time of day uses the local hour and reports the busiest one", () => {
    const { buckets, peak } = stats([...setsOn(16, 2, 9), ...setsOn(15, 3, 14)]).timeOfDay();
    expect(buckets).toHaveLength(24);
    expect(buckets[9]).toEqual({ hour: 9, count: 2 });
    expect(buckets[14]!.count).toBe(3);
    expect(peak).toBe(14);
    expect(stats([]).timeOfDay().peak).toBeNull();
  });

  it("splits sets by what prompted them", () => {
    const history = [
      logged(ex, nov(16), 10, 20, { trigger: "idle" }),
      logged(ex, nov(16), 10, 20, { trigger: "idle" }),
      logged(ex, nov(16), 10, 20, { trigger: "timer" }),
      logged(ex, nov(16), 10, 20, { trigger: "manual" }),
    ];
    expect(stats(history).triggerMix()).toEqual({ idle: 50, timer: 25, manual: 25 });
    expect(stats([]).triggerMix()).toEqual({ idle: 0, timer: 0, manual: 0 });
  });
});
