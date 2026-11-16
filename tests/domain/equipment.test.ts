import { DEFAULT_SETTINGS, EQUIPMENT_KEYS, EQUIPMENT_NAMES, SettingsSchema } from "@nabd/domain";

const withEquipment = (equipment: unknown[]) =>
  SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, equipment }).success;

describe("equipment", () => {
  it("every kind of equipment has a name and is valid in stored data", () => {
    for (const key of EQUIPMENT_KEYS) {
      expect(EQUIPMENT_NAMES[key], key).toBeTruthy();
      expect(withEquipment([key]), key).toBe(true);
    }
    expect(withEquipment(["treadmill"])).toBe(false);
  });
});
