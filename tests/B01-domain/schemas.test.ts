import {
  AppDataSchema,
  DayStateSchema,
  DEFAULT_SETTINGS,
  ExerciseSchema,
  GROUP_PRIMARY_MUSCLE,
  LoggedSetSchema,
  MUSCLE_GROUPS,
  MUSCLE_NAMES,
  MUSCLE_PRIMARY_GROUP,
  MUSCLES,
  SettingsSchema,
  displayWeight,
  formatWeight,
  kgFromDisplay,
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
});

describe("weights", () => {
  it("stores kg and shows the chosen unit, rounded to one decimal", () => {
    expect(displayWeight(60, "kg")).toBe(60);
    expect(displayWeight(60, "lb")).toBe(132.3);
    expect(formatWeight(12.5, "kg")).toBe("12.5 kg");
    expect(formatWeight(kgFromDisplay(27.5, "lb"), "lb")).toBe("27.5 lb");
  });

  it("round-trips typed pound values through kg without drift", () => {
    for (const pounds of [2.5, 25, 27.5, 135, 225]) {
      expect(displayWeight(kgFromDisplay(pounds, "lb"), "lb")).toBe(pounds);
    }
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
      skipped: [],
      extras: [],
      paused: false,
    });
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
