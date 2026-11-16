import {
  addDays,
  atMinuteOfDay,
  dateKey,
  formatClock,
  formatMinuteOfDay,
  minuteOfDay,
  parseDateKey,
  startOfDay,
  startOfWeek,
} from "@nabd/domain";

describe("local date helpers", () => {
  const lateEvening = new Date(2026, 10, 16, 23, 30);

  it("keys a moment by the user's calendar day, even late in the evening", () => {
    expect(dateKey(lateEvening)).toBe("2026-11-16");
    expect(dateKey(new Date(2026, 0, 5, 0, 1))).toBe("2026-01-05");
  });

  it("round-trips a key to local midnight", () => {
    expect(parseDateKey("2026-11-16")).toEqual(new Date(2026, 10, 16));
    expect(dateKey(parseDateKey("2026-03-01"))).toBe("2026-03-01");
    expect(startOfDay(lateEvening)).toEqual(new Date(2026, 10, 16));
  });

  it("moves by whole days across month and year boundaries", () => {
    expect(dateKey(addDays(new Date(2026, 10, 30, 15), 1))).toBe("2026-12-01");
    expect(dateKey(addDays(new Date(2026, 0, 1), -1))).toBe("2025-12-31");
  });

  it("starts the week on Monday", () => {
    expect(dateKey(startOfWeek(new Date(2026, 10, 16)))).toBe("2026-11-16");
    expect(dateKey(startOfWeek(new Date(2026, 10, 22, 20)))).toBe("2026-11-16");
    expect(dateKey(startOfWeek(new Date(2026, 10, 18)))).toBe("2026-11-16");
  });

  it("converts between a time of day and minutes since midnight", () => {
    expect(minuteOfDay(lateEvening)).toBe(23 * 60 + 30);
    expect(atMinuteOfDay(lateEvening, 9 * 60 + 5)).toEqual(new Date(2026, 10, 16, 9, 5));
    expect(formatMinuteOfDay(545)).toBe("09:05");
    expect(formatClock(lateEvening)).toBe("23:30");
  });
});
