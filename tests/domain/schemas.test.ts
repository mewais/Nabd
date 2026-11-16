import {
  AppDataSchema,
  DEFAULT_SETTINGS,
  DayStateSchema,
  EMPTY_DRAFT,
  ExerciseSchema,
  GROUP_PRIMARY_MUSCLE,
  LoggedSetSchema,
  MUSCLES,
  MUSCLE_GROUPS,
  MUSCLE_NAMES,
  MUSCLE_PRIMARY_GROUP,
  SettingsSchema,
  displayWeight,
  editableWeight,
  exerciseFromDraft,
  formatWeight,
  isCompleteDraft,
  isWorkDay,
  kgFromDisplay,
  loadStepKg,
  salvageSettings,
  withWeightUnit,
} from "@nabd/domain";

describe("muscle taxonomy", () => {
  it("names every muscle and files each under a group", () => {
    for (const muscle of MUSCLES) {
      expect(MUSCLE_NAMES[muscle], muscle).toBeTruthy();
      expect(MUSCLE_GROUPS, muscle).toContain(MUSCLE_PRIMARY_GROUP[muscle]);
    }
  });

  it("each group's representative muscle belongs to that group", () => {
    for (const group of MUSCLE_GROUPS) {
      expect(MUSCLE_PRIMARY_GROUP[GROUP_PRIMARY_MUSCLE[group]], group).toBe(group);
    }
  });
});

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
    expect(isWorkDay(DEFAULT_SETTINGS, new Date(2026, 10, 20))).toBe(true);
    expect(isWorkDay(DEFAULT_SETTINGS, new Date(2026, 10, 21))).toBe(false);
    expect(isWorkDay({ workDays: [6] }, new Date(2026, 10, 21, 23, 59))).toBe(true);
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

describe("a custom-exercise draft", () => {
  it("is complete with a name and a primary muscle, and only then becomes an exercise", () => {
    const draft = { ...EMPTY_DRAFT, name: "Desk Dips", primary: ["triceps" as const] };
    expect(isCompleteDraft(draft)).toBe(true);
    expect(exerciseFromDraft(draft, "x1")).toMatchObject({ id: "x1", name: "Desk Dips" });
    for (const incomplete of [
      { ...draft, name: "   " },
      { ...draft, primary: [] },
    ]) {
      expect(isCompleteDraft(incomplete)).toBe(false);
      expect(exerciseFromDraft(incomplete, "x1")).toBeNull();
    }
  });
});

describe("weights", () => {
  it("stores kg and shows a weight exactly in the unit it was entered in, with no trailing zeros", () => {
    expect(displayWeight(60, "kg")).toBe(60);
    expect(formatWeight(20, "kg")).toBe("20 kg");
    expect(formatWeight(12.5, "kg")).toBe("12.5 kg");
    expect(formatWeight(kgFromDisplay(27.5, "lb"), "lb")).toBe("27.5 lb");
    expect(formatWeight(kgFromDisplay(22.25, "lb"), "lb")).toBe("22.25 lb");
    // Odd decimals are kept too: they were typed.
    expect(formatWeight(20.13, "kg")).toBe("20.13 kg");
    expect(formatWeight(kgFromDisplay(44.1, "lb"), "lb")).toBe("44.1 lb");
  });

  it("holds a weight to two decimals in a field, whatever unit it was entered in", () => {
    expect(editableWeight(20, "lb")).toBe(44.09);
    expect(editableWeight(kgFromDisplay(44.34, "lb"), "lb")).toBe(44.34);
    expect(editableWeight(21.25, "kg")).toBe(21.25);
  });

  it("shows a weight from the other unit as a conversion, to one decimal", () => {
    expect(displayWeight(60, "lb")).toBe(132.3);
    expect(formatWeight(20, "kg")).toBe("20 kg");
    expect(formatWeight(20, "lb")).toBe("44.1 lb");
    expect(formatWeight(62.5, "lb")).toBe("137.8 lb");
    expect(formatWeight(21.25, "lb")).toBe("46.8 lb");
    // …and the other way round: 27.5 lb and 25 lb, read in kg.
    expect(formatWeight(kgFromDisplay(27.5, "lb"), "kg")).toBe("12.5 kg");
    expect(formatWeight(kgFromDisplay(25, "lb"), "kg")).toBe("11.3 kg");
    // A sum across units was entered in neither: 20 kg plus a 5 lb plate.
    expect(formatWeight(20 + kgFromDisplay(5, "lb"), "lb")).toBe("49.1 lb");
  });

  it("shows every step of the finest increments exactly", () => {
    expect([20, 21.25, 22.5, 23.75].map((kg) => formatWeight(kg, "kg"))).toEqual([
      "20 kg",
      "21.25 kg",
      "22.5 kg",
      "23.75 kg",
    ]);
    expect([20.25, 20.5, 20.75].map((kg) => displayWeight(kg, "kg"))).toEqual([20.25, 20.5, 20.75]);
    expect(formatWeight(kgFromDisplay(26.25, "lb"), "lb")).toBe("26.25 lb");
  });

  it("round-trips typed pound values through kg without drift", () => {
    for (const pounds of [0.25, 2.5, 25, 26.25, 27.5, 135, 225]) {
      expect(displayWeight(kgFromDisplay(pounds, "lb"), "lb")).toBe(pounds);
    }
  });

  it("reads the smallest load step in kg, whatever unit it was chosen in", () => {
    expect(loadStepKg({ weightIncrement: 2.5, weightUnit: "kg" })).toBe(2.5);
    expect(loadStepKg({ weightIncrement: 5, weightUnit: "lb" })).toBe(2.268);
  });
});

describe("persisted shapes tolerate older data", () => {
  const oldSet = {
    id: "s1",
    exId: "bench",
    exercise: "Bench",
    group: "Chest",
    muscles: ["chest"],
    value: 8,
    weight: null,
    ts: "2026-11-16T10:00:00.000Z",
    date: "2026-11-16",
    trigger: "manual",
  };

  it("a set logged before plan items existed is an unplanned working set", () => {
    expect(LoggedSetSchema.parse(oldSet)).toMatchObject({ planItemId: null, setType: "working" });
    expect(LoggedSetSchema.safeParse({ ...oldSet, trigger: "nagging" }).success).toBe(false);
    expect(LoggedSetSchema.safeParse({ ...oldSet, muscles: ["wings"] }).success).toBe(false);
  });

  it("an old day state (with stored slots) reads as a clean, unpaused day", () => {
    expect(DayStateSchema.parse({ date: "2026-11-16", slots: [{}] })).toEqual({
      date: "2026-11-16",
      dayId: null,
      carried: {},
      skipped: [],
      extras: [],
      paused: false,
    });
  });

  it("a day state keeps the sets an unfinished day has behind it, as whole positive counts", () => {
    const state = (carried: object) => ({ date: "2026-11-16", carried });
    expect(DayStateSchema.parse(state({ bench: 2 })).carried).toEqual({ bench: 2 });
    for (const carried of [{ bench: 0 }, { bench: 1.5 }, { bench: "2" }]) {
      expect(DayStateSchema.safeParse(state(carried)).success).toBe(false);
    }
  });

  it("the weight increment goes down to a quarter, for micro-plates", () => {
    const increment = SettingsSchema.shape.weightIncrement;
    expect(increment.safeParse(0.25).success).toBe(true);
    expect(increment.safeParse(0).success).toBe(false);
  });

  it("an exercise needs a name and at least one primary muscle", () => {
    const valid = {
      id: "x",
      name: "X",
      group: "Chest",
      primary: ["chest"],
      secondary: [],
      equipment: "dumbbell",
      tracking: "weight_reps",
    };
    expect(ExerciseSchema.safeParse(valid).success).toBe(true);
    expect(ExerciseSchema.safeParse({ ...valid, primary: [] }).success).toBe(false);
    expect(ExerciseSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("an export may be partial, but must be a Nabd document", () => {
    expect(AppDataSchema.safeParse({ app: "Nabd", version: 2 }).success).toBe(true);
    expect(
      AppDataSchema.safeParse({ app: "Nabd", version: 2, settings: { interval: 30 } }).success,
    ).toBe(true);
    expect(AppDataSchema.safeParse({ app: "Else", version: 2 }).success).toBe(false);
    expect(AppDataSchema.safeParse({ app: "Nabd" }).success).toBe(false);
  });
});
