import { plural } from "@nabd/domain";

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
