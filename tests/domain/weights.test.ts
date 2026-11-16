import {
  MAX_LOAD_KG,
  boundedLoad,
  editableWeight,
  formatWeight,
  kgFromDisplay,
  loadStepKg,
} from "@nabd/domain";

describe("the loads a set can be given", () => {
  it("are none to the most a set records, and at least one step where a load is needed", () => {
    expect(boundedLoad(-5, "weighted_bodyweight", 2.5)).toBe(0);
    expect(boundedLoad(-5, "assisted_bodyweight", 2.5)).toBe(0);
    expect(boundedLoad(0, "weight_reps", 2.5)).toBe(2.5);
    expect(boundedLoad(1, "weight_duration", 1.25)).toBe(1.25);
    expect(boundedLoad(42.1234, "weight_reps", 2.5)).toBe(42.123);
    expect(boundedLoad(5000, "weight_reps", 2.5)).toBe(MAX_LOAD_KG);
    expect(boundedLoad(5000, "weighted_bodyweight", 2.5)).toBe(MAX_LOAD_KG);
  });
});

describe("weights", () => {
  it("stores kg and shows a weight exactly in the unit it was entered in, with no trailing zeros", () => {
    expect(formatWeight(60, "kg")).toBe("60 kg");
    expect(formatWeight(20, "kg")).toBe("20 kg");
    expect(formatWeight(12.5, "kg")).toBe("12.5 kg");
    expect(formatWeight(kgFromDisplay(27.5, "lb"), "lb")).toBe("27.5 lb");
    expect(formatWeight(kgFromDisplay(22.25, "lb"), "lb")).toBe("22.25 lb");
    // Odd decimals are kept too: they were typed.
    expect(formatWeight(20.13, "kg")).toBe("20.13 kg");
    expect(formatWeight(kgFromDisplay(44.1, "lb"), "lb")).toBe("44.1 lb");
  });

  it("holds a weight to two decimals in a field, whatever unit it was entered in", () => {
    expect(editableWeight(20, "lb")).toBe(44.09);
    expect(editableWeight(kgFromDisplay(44.34, "lb"), "lb")).toBe(44.34);
    expect(editableWeight(21.25, "kg")).toBe(21.25);
  });

  it("shows a weight from the other unit as a conversion, to one decimal", () => {
    expect(formatWeight(60, "lb")).toBe("132.3 lb");
    expect(formatWeight(20, "kg")).toBe("20 kg");
    expect(formatWeight(20, "lb")).toBe("44.1 lb");
    expect(formatWeight(62.5, "lb")).toBe("137.8 lb");
    expect(formatWeight(21.25, "lb")).toBe("46.8 lb");
    // …and the other way round: 27.5 lb and 25 lb, read in kg.
    expect(formatWeight(kgFromDisplay(27.5, "lb"), "kg")).toBe("12.5 kg");
    expect(formatWeight(kgFromDisplay(25, "lb"), "kg")).toBe("11.3 kg");
    // A sum across units was entered in neither: 20 kg plus a 5 lb plate.
    expect(formatWeight(20 + kgFromDisplay(5, "lb"), "lb")).toBe("49.1 lb");
  });

  it("shows every step of the finest increments exactly", () => {
    expect([20, 21.25, 22.5, 23.75].map((kg) => formatWeight(kg, "kg"))).toEqual([
      "20 kg",
      "21.25 kg",
      "22.5 kg",
      "23.75 kg",
    ]);
    expect([20.25, 20.5, 20.75].map((kg) => formatWeight(kg, "kg"))).toEqual([
      "20.25 kg",
      "20.5 kg",
      "20.75 kg",
    ]);
    expect(formatWeight(kgFromDisplay(26.25, "lb"), "lb")).toBe("26.25 lb");
  });

  it("round-trips typed pound values through kg without drift", () => {
    for (const pounds of [0.25, 2.5, 25, 26.25, 27.5, 135, 225]) {
      expect(formatWeight(kgFromDisplay(pounds, "lb"), "lb")).toBe(`${pounds} lb`);
    }
  });

  it("reads the smallest load step in kg, whatever unit it was chosen in", () => {
    expect(loadStepKg({ weightIncrement: 2.5, weightUnit: "kg" })).toBe(2.5);
    expect(loadStepKg({ weightIncrement: 5, weightUnit: "lb" })).toBe(2.268);
  });
});
