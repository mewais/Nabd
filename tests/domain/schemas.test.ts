import {
  AppDataSchema,
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
  exerciseFromDraft,
  isCompleteDraft,
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

  it("a set logged before sets had a session belongs to the session of its own date", () => {
    expect(LoggedSetSchema.parse(oldSet).session).toBe("2026-11-16");
    expect(LoggedSetSchema.parse({ ...oldSet, session: "2026-11-13" }).session).toBe("2026-11-13");
    expect(LoggedSetSchema.safeParse({ ...oldSet, session: 13 }).success).toBe(false);
  });

  it("an old day state (with stored slots) reads as a clean, unpaused day", () => {
    expect(DayStateSchema.parse({ date: "2026-11-16", slots: [{}] })).toEqual({
      date: "2026-11-16",
      dayId: null,
      carried: null,
      skipped: [],
      extras: [],
      paused: false,
    });
  });

  it("a day state keeps what an unfinished day has behind it, as whole counts of each kind", () => {
    const state = (sets: object) => ({
      date: "2026-11-17",
      carried: { startedOn: "2026-11-16", items: { bench: { exId: "bench", sets } } },
    });
    expect(DayStateSchema.parse(state({ working: 2 })).carried).toEqual({
      startedOn: "2026-11-16",
      items: { bench: { exId: "bench", sets: { working: 2, warmup: 0, drop: 0 } } },
    });
    for (const sets of [{ working: -1 }, { working: 1.5 }, { working: "2" }]) {
      expect(DayStateSchema.safeParse(state(sets)).success).toBe(false);
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
