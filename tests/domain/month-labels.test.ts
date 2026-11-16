import { monthAndDay, monthName } from "@nabd/domain";

describe("month labels", () => {
  it("names a month the way Date.getMonth() numbers it", () => {
    expect(monthName(0)).toBe("January");
    expect(monthName(new Date(2026, 10, 16).getMonth())).toBe("November");
    expect(monthName(11)).toBe("December");
  });

  it("writes a date as its month, shortened to three letters, and its day", () => {
    expect(monthAndDay(new Date(2026, 8, 7))).toBe("Sep 7");
  });

  it("refuses a number that is not a month", () => {
    expect(() => monthName(12)).toThrow(RangeError);
  });
});
