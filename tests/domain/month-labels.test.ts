import { monthName, monthShort } from "@nabd/domain";

describe("month labels", () => {
  it("names a month the way Date.getMonth() numbers it", () => {
    expect(monthName(0)).toBe("January");
    expect(monthName(new Date(2026, 10, 16).getMonth())).toBe("November");
    expect(monthName(11)).toBe("December");
  });

  it("shortens a name to three letters", () => {
    expect(monthShort(8)).toBe("Sep");
  });

  it("refuses a number that is not a month", () => {
    expect(() => monthName(12)).toThrow(RangeError);
  });
});
