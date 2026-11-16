import { sameList, sameRecord, toggled } from "@nabd/domain";

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

describe("sameList and sameRecord", () => {
  it("compare element by element, in order", () => {
    expect(sameList(["a", "b"], ["a", "b"])).toBe(true);
    expect(sameList(["a", "b"], ["b", "a"])).toBe(false);
    expect(sameList(["a"], ["a", "b"])).toBe(false);
  });

  it("compare value by value, under the same keys, whatever their order", () => {
    expect(sameRecord({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(sameRecord({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(sameRecord({ a: 1, b: 2 }, { a: 1, c: 2 })).toBe(false);
  });
});
