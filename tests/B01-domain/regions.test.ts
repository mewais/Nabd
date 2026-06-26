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

  it("specific muscles have expected coarse slugs", () => {
    expect(MUSCLE_REGION_MAP.chest).toContain("chest");
    expect(MUSCLE_REGION_MAP.lats).toContain("upper-back");
    expect(MUSCLE_REGION_MAP.biceps).toContain("biceps");
    expect(MUSCLE_REGION_MAP.triceps).toContain("triceps");
    expect(MUSCLE_REGION_MAP.front_delts).toContain("deltoids");
    expect(MUSCLE_REGION_MAP.side_delts).toContain("deltoids");
    expect(MUSCLE_REGION_MAP.rear_delts).toContain("deltoids");
    expect(MUSCLE_REGION_MAP.upper_traps).toContain("trapezius");
    expect(MUSCLE_REGION_MAP.lower_traps).toContain("trapezius");
    expect(MUSCLE_REGION_MAP.rhomboids).toContain("upper-back");
    expect(MUSCLE_REGION_MAP.lower_back).toContain("lower-back");
    expect(MUSCLE_REGION_MAP.abs).toContain("abs");
    expect(MUSCLE_REGION_MAP.obliques).toContain("obliques");
    expect(MUSCLE_REGION_MAP.quads).toContain("quadriceps");
    expect(MUSCLE_REGION_MAP.hamstrings).toContain("hamstring");
    expect(MUSCLE_REGION_MAP.glutes).toContain("gluteal");
    expect(MUSCLE_REGION_MAP.abductors).toContain("gluteal");
    expect(MUSCLE_REGION_MAP.adductors).toContain("adductors");
    expect(MUSCLE_REGION_MAP.calves).toContain("calves");
    expect(MUSCLE_REGION_MAP.tibialis).toContain("tibialis");
    expect(MUSCLE_REGION_MAP.hip_flexors).toContain("quadriceps");
    expect(MUSCLE_REGION_MAP.forearms).toContain("forearm");
    expect(MUSCLE_REGION_MAP.neck).toContain("neck");
  });
});
