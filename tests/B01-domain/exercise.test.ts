import { describe, it, expect } from "vitest";
import { ExerciseSchema, ExerciseListSchema } from "@nabd/domain";

const validExercise = {
  id: "bench-press",
  name: "Bench Press",
  group: "Chest",
  primary: ["chest"],
  secondary: ["triceps", "front_delts"],
  equipment: "barbell",
  tracking: "weight_reps",
};

describe("exercise.ts", () => {
  it("valid exercise parses successfully", () => {
    const result = ExerciseSchema.safeParse(validExercise);
    expect(result.success).toBe(true);
  });

  it("optional fields (timeBased, custom) are accepted when present", () => {
    const result = ExerciseSchema.safeParse({
      ...validExercise,
      timeBased: true,
      custom: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timeBased).toBe(true);
      expect(result.data.custom).toBe(true);
    }
  });

  it("optional fields (timeBased, custom) are accepted when absent", () => {
    const result = ExerciseSchema.safeParse(validExercise);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timeBased).toBeUndefined();
      expect(result.data.custom).toBeUndefined();
    }
  });

  it("missing primary array is rejected", () => {
    const { primary: _primary, ...withoutPrimary } = validExercise;
    const result = ExerciseSchema.safeParse(withoutPrimary);
    expect(result.success).toBe(false);
  });

  it("empty primary array is rejected (min 1)", () => {
    const result = ExerciseSchema.safeParse({ ...validExercise, primary: [] });
    expect(result.success).toBe(false);
  });

  it("bad muscle in primary is rejected", () => {
    const result = ExerciseSchema.safeParse({
      ...validExercise,
      primary: ["pecs"],
    });
    expect(result.success).toBe(false);
  });

  it("bad muscle in secondary is rejected", () => {
    const result = ExerciseSchema.safeParse({
      ...validExercise,
      secondary: ["pecs"],
    });
    expect(result.success).toBe(false);
  });

  it("invalid group is rejected", () => {
    const result = ExerciseSchema.safeParse({
      ...validExercise,
      group: "InvalidGroup",
    });
    expect(result.success).toBe(false);
  });

  it("invalid equipment is rejected", () => {
    const result = ExerciseSchema.safeParse({
      ...validExercise,
      equipment: "treadmill",
    });
    expect(result.success).toBe(false);
  });

  it("invalid tracking type is rejected", () => {
    const result = ExerciseSchema.safeParse({
      ...validExercise,
      tracking: "invalid_track",
    });
    expect(result.success).toBe(false);
  });

  it("empty id is rejected", () => {
    const result = ExerciseSchema.safeParse({ ...validExercise, id: "" });
    expect(result.success).toBe(false);
  });

  it("empty name is rejected", () => {
    const result = ExerciseSchema.safeParse({ ...validExercise, name: "" });
    expect(result.success).toBe(false);
  });

  it("ExerciseListSchema accepts an array of valid exercises", () => {
    const result = ExerciseListSchema.safeParse([validExercise, validExercise]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBe(2);
    }
  });

  it("ExerciseListSchema rejects an array with an invalid exercise", () => {
    const result = ExerciseListSchema.safeParse([
      validExercise,
      { ...validExercise, primary: ["pecs"] },
    ]);
    expect(result.success).toBe(false);
  });

  it("ExerciseListSchema accepts an empty array", () => {
    const result = ExerciseListSchema.safeParse([]);
    expect(result.success).toBe(true);
  });
});
