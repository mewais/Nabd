import {
  WEEK_ORDER,
  isWeekday,
  weekdayInitial,
  weekdayName,
  weekdayOf,
  weekdayShort,
} from "@nabd/domain";

describe("weekday labels", () => {
  it("names a weekday the way Date.getDay() numbers it", () => {
    expect(weekdayName(0)).toBe("Sunday");
    expect(weekdayName(weekdayOf(new Date(2026, 10, 16)))).toBe("Monday");
    expect(weekdayName(6)).toBe("Saturday");
  });

  it("shortens a name to three letters or its initial", () => {
    expect(weekdayShort(3)).toBe("Wed");
    expect(weekdayInitial(3)).toBe("W");
  });

  it("tells a weekday number from any other", () => {
    expect([0, 3, 6].every(isWeekday)).toBe(true);
    expect([-1, 7, 2.5].some(isWeekday)).toBe(false);
  });

  it("orders the week Monday first, Sunday last", () => {
    expect(WEEK_ORDER.map(weekdayShort)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  });
});
