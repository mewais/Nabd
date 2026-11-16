import { MUSCLE_REGION_MAP, MUSCLES } from "@nabd/domain";

describe("MUSCLE_REGION_MAP", () => {
  it("places every tracking muscle on at least one body-map region", () => {
    expect(Object.keys(MUSCLE_REGION_MAP).sort()).toEqual([...MUSCLES].sort());
    for (const muscle of MUSCLES) expect(MUSCLE_REGION_MAP[muscle].length, muscle).toBeGreaterThan(0);
  });

  it("lets muscles the map cannot tell apart share a region", () => {
    const { front_delts, side_delts, rear_delts, glutes, abductors } = MUSCLE_REGION_MAP;
    expect(side_delts).toEqual(front_delts);
    expect(rear_delts).toEqual(front_delts);
    expect(abductors).toEqual(glutes);
  });
});
