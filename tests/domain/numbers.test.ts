import { clamp, percentOf, roundTo, sum } from "@nabd/domain";

describe("roundTo", () => {
  it("rounds to the given number of decimals", () => {
    expect(roundTo(71.0667, 1)).toBe(71.1);
    expect(roundTo(2.5, 0)).toBe(3);
    expect(roundTo(60, 3)).toBe(60);
  });

  it("clears the floating-point dust of stepped decimals", () => {
    expect(roundTo(0.7 + 0.05, 2)).toBe(0.75);
    expect(roundTo(0.1 + 0.2, 3)).toBe(0.3);
  });
});

describe("clamp", () => {
  it("holds a value within its bounds", () => {
    expect(clamp(120, 0, 100)).toBe(100);
    expect(clamp(-5, 0, 100)).toBe(0);
    expect(clamp(47, 0, 100)).toBe(47);
  });
});

describe("sum", () => {
  it("totals what each element amounts to, and is zero for none", () => {
    expect(sum([{ n: 2 }, { n: 3 }], (e) => e.n)).toBe(5);
    expect(sum([], () => 1)).toBe(0);
  });
});

describe("percentOf", () => {
  it("is a whole percentage, and 0 when there is no whole", () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(5, 0)).toBe(0);
  });
});
