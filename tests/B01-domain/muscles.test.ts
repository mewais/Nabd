import { describe, it, expect } from "vitest";
import {
  MUSCLES,
  MUSCLE_NAMES,
  MUSCLE_GROUPS,
  GROUP_PRIMARY_MUSCLE,
  GROUP_MUSCLES,
  MUSCLE_PRIMARY_GROUP,
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

  describe("MUSCLE_PRIMARY_GROUP", () => {
    it("has an entry for every one of the 23 muscles, and every value is a valid MuscleGroup", () => {
      for (const muscle of MUSCLES) {
        expect(MUSCLE_PRIMARY_GROUP).toHaveProperty(muscle);
        expect(MUSCLE_GROUPS).toContain(MUSCLE_PRIMARY_GROUP[muscle]);
      }
    });

    it("spot-checks canonical group mappings", () => {
      // Shoulders
      expect(MUSCLE_PRIMARY_GROUP["front_delts"]).toBe("Shoulders");
      expect(MUSCLE_PRIMARY_GROUP["side_delts"]).toBe("Shoulders");
      expect(MUSCLE_PRIMARY_GROUP["rear_delts"]).toBe("Shoulders");
      // Back
      expect(MUSCLE_PRIMARY_GROUP["lats"]).toBe("Back");
      expect(MUSCLE_PRIMARY_GROUP["rhomboids"]).toBe("Back");
      expect(MUSCLE_PRIMARY_GROUP["lower_traps"]).toBe("Back");
      expect(MUSCLE_PRIMARY_GROUP["lower_back"]).toBe("Back");
      // Traps
      expect(MUSCLE_PRIMARY_GROUP["upper_traps"]).toBe("Traps");
      expect(MUSCLE_PRIMARY_GROUP["neck"]).toBe("Traps");
      // Glutes
      expect(MUSCLE_PRIMARY_GROUP["abductors"]).toBe("Glutes");
      expect(MUSCLE_PRIMARY_GROUP["adductors"]).toBe("Glutes");
      expect(MUSCLE_PRIMARY_GROUP["glutes"]).toBe("Glutes");
      // Quads
      expect(MUSCLE_PRIMARY_GROUP["hip_flexors"]).toBe("Quads");
      // Abs
      expect(MUSCLE_PRIMARY_GROUP["obliques"]).toBe("Abs");
      // Calves
      expect(MUSCLE_PRIMARY_GROUP["tibialis"]).toBe("Calves");
      // Single-muscle groups
      expect(MUSCLE_PRIMARY_GROUP["chest"]).toBe("Chest");
    });

    it("for every muscle, its primary group's GROUP_MUSCLES includes it — except neck (the only exception, which maps to Traps)", () => {
      // neck is the one muscle not listed in any GROUP_MUSCLES entry
      expect(MUSCLE_PRIMARY_GROUP["neck"]).toBe("Traps");
      expect(GROUP_MUSCLES["Traps"]).not.toContain("neck");

      // All other muscles must appear in their assigned group's muscle list
      for (const muscle of MUSCLES) {
        if (muscle === "neck") continue;
        const group = MUSCLE_PRIMARY_GROUP[muscle];
        expect(GROUP_MUSCLES[group]).toContain(muscle);
      }
    });
  });
});
