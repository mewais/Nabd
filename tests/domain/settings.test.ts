import {
  DEFAULT_SETTINGS,
  SettingsSchema,
  isWorkday,
  salvageSettings,
  withWeightUnit,
} from "@nabd/domain";

describe("settings", () => {
  it("the defaults are valid and describe a sensible workday", () => {
    expect(SettingsSchema.parse(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.workStart).toBeLessThan(DEFAULT_SETTINGS.workEnd);
    expect(DEFAULT_SETTINGS.minGap).toBeLessThan(DEFAULT_SETTINGS.interval);
  });

  it("rejects out-of-range values", () => {
    const invalid = (patch: object) =>
      SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...patch }).success;
    expect(invalid({ interval: 4 })).toBe(false);
    expect(invalid({ minGap: 0 })).toBe(false);
    expect(invalid({ opacity: 1.2 })).toBe(false);
    expect(invalid({ workEnd: 1500 })).toBe(false);
    expect(invalid({ weightIncrement: 0 })).toBe(false);
    expect(invalid({ equipment: ["sled"] })).toBe(false);
    expect(invalid({ theme: "translucent" })).toBe(false);
  });

  it("works Monday to Friday unless told otherwise, and always on at least one weekday", () => {
    expect(DEFAULT_SETTINGS.workDays).toEqual([1, 2, 3, 4, 5]);
    const invalid = (workDays: unknown) =>
      SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, workDays }).success;
    expect(invalid([0, 6])).toBe(true);
    expect(invalid([])).toBe(false);
    expect(invalid([7])).toBe(false);
    expect(invalid([1.5])).toBe(false);
  });

  it("knows which dates fall on a workday", () => {
    // Fri 20 and Sat 21 Nov 2026.
    expect(isWorkday(DEFAULT_SETTINGS, new Date(2026, 10, 20))).toBe(true);
    expect(isWorkday(DEFAULT_SETTINGS, new Date(2026, 10, 21))).toBe(false);
    expect(isWorkday({ workDays: [6] }, new Date(2026, 10, 21, 23, 59))).toBe(true);
  });
});

describe("settings read back from storage, field by field", () => {
  it("keeps every valid field, and names the invalid ones it put back to their defaults", () => {
    const stored = { ...DEFAULT_SETTINGS, theme: "neon", interval: 30, opacity: 7, glass: true };
    expect(salvageSettings(stored)).toEqual({
      settings: { ...DEFAULT_SETTINGS, interval: 30, glass: true },
      reset: ["theme", "opacity"],
    });
  });

  it("fills the fields an older version never saved, without calling that a repair", () => {
    expect(salvageSettings({ interval: 30 })).toEqual({
      settings: { ...DEFAULT_SETTINGS, interval: 30 },
      reset: [],
    });
    expect(salvageSettings(null)).toEqual({ settings: DEFAULT_SETTINGS, reset: [] });
    expect(salvageSettings("garbage").settings).toEqual(DEFAULT_SETTINGS);
  });

  it("gives settings saved before workdays existed the default week, and mends a bad one", () => {
    expect(salvageSettings({ interval: 30 }).settings.workDays).toEqual([1, 2, 3, 4, 5]);
    expect(salvageSettings({ workDays: [6, 0] })).toEqual({
      settings: { ...DEFAULT_SETTINGS, workDays: [6, 0] },
      reset: [],
    });
    expect(salvageSettings({ workDays: [] })).toEqual({
      settings: DEFAULT_SETTINGS,
      reset: ["workDays"],
    });
  });

  it("puts back a workday that ends before it starts", () => {
    const { settings, reset } = salvageSettings({ workStart: 1200, workEnd: 600, interval: 30 });
    expect(settings).toEqual({ ...DEFAULT_SETTINGS, interval: 30 });
    expect(reset).toEqual(["workStart", "workEnd"]);
  });
});

describe("switching the weight unit", () => {
  it("moves the conventional increment to the new unit's: 2.5 kg ↔ 5 lb", () => {
    const pounds = withWeightUnit(DEFAULT_SETTINGS, "lb");
    expect(pounds).toMatchObject({ weightUnit: "lb", weightIncrement: 5 });
    expect(withWeightUnit(pounds, "kg")).toEqual(DEFAULT_SETTINGS);
  });

  it("leaves an increment of the user's own as the number it is", () => {
    const micro = { ...DEFAULT_SETTINGS, weightIncrement: 1.25 };
    expect(withWeightUnit(micro, "lb")).toMatchObject({ weightUnit: "lb", weightIncrement: 1.25 });
    // 2.5 is the usual step in kg, but in pounds it was a choice.
    const fine = { ...DEFAULT_SETTINGS, weightUnit: "lb" as const, weightIncrement: 2.5 };
    expect(withWeightUnit(fine, "kg")).toMatchObject({ weightUnit: "kg", weightIncrement: 2.5 });
    expect(withWeightUnit(micro, "kg")).toEqual(micro);
  });
});

describe("the body weight setting", () => {
  it("is unknown by default, and takes a plausible weight in kg or nothing", () => {
    expect(DEFAULT_SETTINGS.bodyWeight).toBeNull();
    const bodyWeight = SettingsSchema.shape.bodyWeight;
    expect(bodyWeight.safeParse(80).success).toBe(true);
    expect(bodyWeight.safeParse(null).success).toBe(true);
    expect(bodyWeight.safeParse(5).success).toBe(false);
    expect(bodyWeight.safeParse(1000).success).toBe(false);
  });

  it("is read back field by field like every other, and reset alone when it cannot be kept", () => {
    expect(salvageSettings({ ...DEFAULT_SETTINGS, bodyWeight: 81.5 }).settings.bodyWeight).toBe(
      81.5,
    );
    expect(salvageSettings({ ...DEFAULT_SETTINGS, bodyWeight: "heavy" })).toMatchObject({
      settings: { ...DEFAULT_SETTINGS, bodyWeight: null },
      reset: ["bodyWeight"],
    });
  });
});
