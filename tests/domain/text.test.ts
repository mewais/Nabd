import { formatAmount, formatDuration, formatGain, plural } from "@nabd/domain";

describe("plural", () => {
  it("keeps the noun singular for exactly one", () => {
    expect(plural(1, "set")).toBe("1 set");
    expect(plural(1, "exercise")).toBe("1 exercise");
  });

  it("adds an s for zero, many and fractional counts", () => {
    expect(plural(0, "set")).toBe("0 sets");
    expect(plural(3, "session")).toBe("3 sessions");
    expect(plural(1.5, "set")).toBe("1.5 sets");
  });
});

describe("formatDuration", () => {
  it("writes seconds as M:SS", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(75)).toBe("1:15");
    expect(formatDuration(600)).toBe("10:00");
  });
});

describe("formatAmount and formatGain", () => {
  it("round to one decimal and sign gains", () => {
    expect(formatAmount(71.0667, "kg e1RM")).toBe("71.1 kg e1RM");
    expect(formatAmount(12, "reps")).toBe("12 reps");
    expect(formatGain(2.5, "kg")).toBe("+2.5 kg");
    expect(formatGain(-1, "reps")).toBe("-1 reps");
    expect(formatGain(0, "reps")).toBe("0 reps");
  });
});
