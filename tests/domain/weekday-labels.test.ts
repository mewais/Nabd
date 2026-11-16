import { WEEK_ORDER, weekdayInitial, weekdayName, weekdayShort } from "@nabd/domain";

describe("weekday labels", () => {
  it("names a weekday the way Date.getDay() numbers it", () => {
    expect(weekdayName(0)).toBe("Sunday");
    expect(weekdayName(new Date(2026, 10, 16).getDay())).toBe("Monday");
    expect(weekdayName(6)).toBe("Saturday");
  });

  it("shortens a name to three letters or its initial", () => {
    expect(weekdayShort(3)).toBe("Wed");
    expect(weekdayInitial(3)).toBe("W");
  });

  it("refuses a number that is not a weekday", () => {
    expect(() => weekdayName(7)).toThrow(RangeError);
  });

  it("orders the week Monday first, Sunday last", () => {
    expect(WEEK_ORDER.map(weekdayShort)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  });
});
