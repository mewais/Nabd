import { describe, expect, it } from "vitest";
import { ExerciseLibrary } from "@nabd/dataset";
import { ExerciseProgress } from "@nabd/progress";
import { BENCH, PLANK, PULL_UP, history, loggedSet } from "./fixtures";

describe("ExerciseProgress", () => {
  const progress = new ExerciseProgress(history(), ExerciseLibrary.catalog, "kg");

  it("has one trend per exercise with history, in order of first appearance", () => {
    expect(progress.trends.map((trend) => trend.exId)).toEqual([PLANK, BENCH, PULL_UP]);
  });

  it("finds the trend of an exercise, and none for one never logged", () => {
    expect(progress.trendOf(PULL_UP)).toMatchObject({ exId: PULL_UP, series: [8, 10] });
    expect(progress.trendOf("never_logged")).toBeUndefined();
  });

  it("measures loaded lifts in the unit it is given", () => {
    const inPounds = new ExerciseProgress(history(), ExerciseLibrary.catalog, "lb");

    expect(progress.trendOf(BENCH)?.unit).toBe("kg e1RM");
    expect(inPounds.trendOf(BENCH)?.unit).toBe("lb e1RM");
  });

  it("names an exercise from the library", () => {
    expect(progress.nameOf(BENCH)).toBe("Barbell Bench Press");
  });

  it("falls back to the logged name of an exercise deleted from the library", () => {
    const deleted = { ...loggedSet(PLANK, [11, 18, 9, 0], 30, null, "manual"), exId: "custom_1" };
    const withDeleted = new ExerciseProgress(
      [{ ...deleted, exercise: "Garage Carry" }],
      ExerciseLibrary.catalog,
      "kg",
    );

    expect(withDeleted.nameOf("custom_1")).toBe("Garage Carry");
    expect(withDeleted.trendOf("custom_1")?.series).toEqual([30]);
    expect(withDeleted.nameOf("unknown")).toBe("unknown");
  });
});
