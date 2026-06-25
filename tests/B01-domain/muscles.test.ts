import { describe, it, expect } from "vitest";
import {
  MUSCLES,
  MUSCLE_NAMES,
  MUSCLE_GROUPS,
  GROUP_PRIMARY_MUSCLE,
  GROUP_MUSCLES,
  MuscleKeySchema,
  MuscleGroupSchema,
} from "@nabd/domain";

describe("muscles.ts", () => {
  it("MUSCLES has exactly 23 entries", () => {
    expect(MUSCLES.length).toBe(23);
  });

  it("MUSCLES has no duplicates", () => {
    const unique = new Set(MUSCLES);
    expect(unique.size).toBe(MUSCLES.length);
  });

  it("MUSCLE_NAMES has a key for every muscle", () => {
    for (const muscle of MUSCLES) {
      expect(MUSCLE_NAMES).toHaveProperty(muscle);
      expect(typeof MUSCLE_NAMES[muscle]).toBe("string");
      expect(MUSCLE_NAMES[muscle].length).toBeGreaterThan(0);
    }
  });

  it("MUSCLE_GROUPS has exactly 12 entries", () => {
    expect(MUSCLE_GROUPS.length).toBe(12);
  });

  it("every GROUP_PRIMARY_MUSCLE value is in MUSCLES", () => {
    for (const group of MUSCLE_GROUPS) {
      const primary = GROUP_PRIMARY_MUSCLE[group];
      expect(MUSCLES).toContain(primary);
    }
  });

  it("every GROUP_MUSCLES entry is in MUSCLES", () => {
    for (const group of MUSCLE_GROUPS) {
      const muscles = GROUP_MUSCLES[group];
      for (const m of muscles) {
        expect(MUSCLES).toContain(m);
      }
    }
  });

  it("every GROUP_MUSCLES includes the group's primary muscle", () => {
    for (const group of MUSCLE_GROUPS) {
      const primary = GROUP_PRIMARY_MUSCLE[group];
      expect(GROUP_MUSCLES[group]).toContain(primary);
    }
  });

  it("MuscleKeySchema accepts a valid key", () => {
    const result = MuscleKeySchema.safeParse("chest");
    expect(result.success).toBe(true);
  });

  it('MuscleKeySchema rejects "pecs"', () => {
    const result = MuscleKeySchema.safeParse("pecs");
    expect(result.success).toBe(false);
  });

  it("MuscleKeySchema accepts every muscle in MUSCLES", () => {
    for (const muscle of MUSCLES) {
      const result = MuscleKeySchema.safeParse(muscle);
      expect(result.success).toBe(true);
    }
  });

  it("MuscleGroupSchema accepts a valid group", () => {
    const result = MuscleGroupSchema.safeParse("Chest");
    expect(result.success).toBe(true);
  });

  it("MuscleGroupSchema rejects an invalid group", () => {
    const result = MuscleGroupSchema.safeParse("Pecs");
    expect(result.success).toBe(false);
  });
});
