import { describe, it, expect } from "vitest";
import { MUSCLE_REGION_MAP, MUSCLES } from "@nabd/domain";

describe("regions.ts", () => {
  it("MUSCLE_REGION_MAP has exactly 23 muscles (all of MUSCLES)", () => {
    const keys = Object.keys(MUSCLE_REGION_MAP);
    expect(keys.length).toBe(23);
  });

  it("MUSCLE_REGION_MAP keys are exactly the MUSCLES array", () => {
    const mapKeys = Object.keys(MUSCLE_REGION_MAP).sort();
    const musclesSorted = [...MUSCLES].sort();
    expect(mapKeys).toEqual(musclesSorted);
  });

  it("every muscle in MUSCLES has an entry in MUSCLE_REGION_MAP", () => {
    for (const muscle of MUSCLES) {
      expect(MUSCLE_REGION_MAP).toHaveProperty(muscle);
    }
  });

  it("every MUSCLE_REGION_MAP value is a non-empty string array", () => {
    for (const muscle of MUSCLES) {
      const regions = MUSCLE_REGION_MAP[muscle];
      expect(Array.isArray(regions)).toBe(true);
      expect(regions.length).toBeGreaterThan(0);
      for (const region of regions) {
        expect(typeof region).toBe("string");
        expect(region.length).toBeGreaterThan(0);
      }
    }
  });

  it("MUSCLE_REGION_MAP has no extra keys beyond MUSCLES", () => {
    for (const key of Object.keys(MUSCLE_REGION_MAP)) {
      expect(MUSCLES).toContain(key);
    }
  });

  it("specific muscles have expected region prefixes", () => {
    expect(MUSCLE_REGION_MAP.chest).toContain("chest-upper");
    expect(MUSCLE_REGION_MAP.lats).toContain("lats-upper");
    expect(MUSCLE_REGION_MAP.biceps).toContain("biceps");
    expect(MUSCLE_REGION_MAP.triceps).toContain("triceps-long");
  });
});
