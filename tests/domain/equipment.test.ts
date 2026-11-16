import { EQUIPMENT_KEYS, EQUIPMENT_NAMES, EquipmentSchema } from "@nabd/domain";

describe("equipment", () => {
  it("every kind of equipment has a name and is valid in stored data", () => {
    for (const key of EQUIPMENT_KEYS) {
      expect(EQUIPMENT_NAMES[key], key).toBeTruthy();
      expect(EquipmentSchema.safeParse(key).success, key).toBe(true);
    }
    expect(EquipmentSchema.safeParse("treadmill").success).toBe(false);
  });
});
