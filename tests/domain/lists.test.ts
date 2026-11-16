import { toggled } from "@nabd/domain";

describe("toggled", () => {
  it("adds an item that was missing, at the end", () => {
    expect(toggled(["bench"], "plank")).toEqual(["bench", "plank"]);
  });

  it("removes an item that was there, leaving the original list untouched", () => {
    const list = ["bench", "plank"];
    expect(toggled(list, "bench")).toEqual(["plank"]);
    expect(list).toEqual(["bench", "plank"]);
  });
});
