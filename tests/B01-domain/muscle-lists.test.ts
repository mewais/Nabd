import { MUSCLES, MUSCLES_ANATOMICAL, muscleNames, supersetTags } from "@nabd/domain";

describe("MUSCLES_ANATOMICAL", () => {
  it("lists every tracking muscle exactly once", () => {
    expect([...MUSCLES_ANATOMICAL].sort()).toEqual([...MUSCLES].sort());
  });

  it("reads down the body: shoulders first, legs after arms, neck last", () => {
    const at = (muscle: (typeof MUSCLES)[number]): number => MUSCLES_ANATOMICAL.indexOf(muscle);
    expect(at("front_delts")).toBe(0);
    expect(at("forearms")).toBeLessThan(at("quads"));
    expect(MUSCLES_ANATOMICAL.at(-1)).toBe("neck");
  });
});

describe("muscleNames", () => {
  it("names an exercise's muscles, primary ones first", () => {
    expect(muscleNames({ primary: ["chest"], secondary: ["triceps", "front_delts"] })).toEqual([
      "Chest",
      "Triceps",
      "Front Delts",
    ]);
  });
});

describe("supersetTags", () => {
  it("tags superset members by their place among their partners and nothing else", () => {
    const rows = [{}, { supersetId: "s1" }, { supersetId: "s1" }, {}, { supersetId: "s1" }];
    expect(supersetTags(rows)).toEqual([null, "A1", "A2", null, "A3"]);
  });

  it("numbers each superset on its own", () => {
    const rows = [{ supersetId: "s1" }, { supersetId: "s2" }, { supersetId: "s1" }];
    expect(supersetTags(rows)).toEqual(["A1", "A1", "A2"]);
  });
});
