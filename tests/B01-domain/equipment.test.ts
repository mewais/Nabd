import { describe, it, expect } from "vitest";
import {
  EQUIPMENT_KEYS,
  EQUIPMENT_NAMES,
  GYM_PROFILES,
  EquipmentSchema,
  GymProfileSchema,
} from "@nabd/domain";

describe("equipment.ts", () => {
  it("EQUIPMENT_KEYS has exactly 11 entries", () => {
    expect(EQUIPMENT_KEYS.length).toBe(11);
  });

  it("EQUIPMENT_NAMES has a name for every equipment key", () => {
    for (const key of EQUIPMENT_KEYS) {
      expect(EQUIPMENT_NAMES).toHaveProperty(key);
      expect(typeof EQUIPMENT_NAMES[key]).toBe("string");
      expect(EQUIPMENT_NAMES[key].length).toBeGreaterThan(0);
    }
  });

  it("every GYM_PROFILES equipment entry is in EQUIPMENT_KEYS", () => {
    for (const profile of GYM_PROFILES) {
      for (const eq of profile.equipment) {
        expect(EQUIPMENT_KEYS).toContain(eq);
      }
    }
  });

  it("EquipmentSchema accepts a valid key", () => {
    const result = EquipmentSchema.safeParse("barbell");
    expect(result.success).toBe(true);
  });

  it("EquipmentSchema rejects an invalid key", () => {
    const result = EquipmentSchema.safeParse("treadmill");
    expect(result.success).toBe(false);
  });

  it("EquipmentSchema accepts every equipment key", () => {
    for (const key of EQUIPMENT_KEYS) {
      const result = EquipmentSchema.safeParse(key);
      expect(result.success).toBe(true);
    }
  });

  it("GymProfileSchema accepts a valid profile", () => {
    const result = GymProfileSchema.safeParse({
      id: "test",
      name: "Test Gym",
      equipment: ["barbell", "dumbbell"],
    });
    expect(result.success).toBe(true);
  });

  it("GymProfileSchema rejects a profile with invalid equipment", () => {
    const result = GymProfileSchema.safeParse({
      id: "test",
      name: "Test Gym",
      equipment: ["treadmill"],
    });
    expect(result.success).toBe(false);
  });

  it("GYM_PROFILES all parse against GymProfileSchema", () => {
    for (const profile of GYM_PROFILES) {
      const result = GymProfileSchema.safeParse(profile);
      expect(result.success).toBe(true);
    }
  });

  it("GYM_PROFILES has home, commercial, and travel profiles", () => {
    const ids = GYM_PROFILES.map((p) => p.id);
    expect(ids).toContain("home");
    expect(ids).toContain("commercial");
    expect(ids).toContain("travel");
  });
});
