import { describe, it, expect } from "vitest";
import {
  EQUIPMENT_KEYS,
  EQUIPMENT_NAMES,
  EquipmentSchema,
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
});
