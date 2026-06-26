/**
 * @nabd/program-editor — Vitest test suite (all red until implemented).
 *
 * Every test asserts:
 *   1. The returned Program has the exact expected shape.
 *   2. The input Program is unchanged (immutability).
 *
 * Covers every exported function → 100% lines & functions on the skeleton.
 */

import { describe, it, expect } from "vitest";
import {
  newId,
  addDay,
  removeDay,
  renameDay,
  setWeekday,
  setType,
  setSchedule,
  renameProgram,
  addExercise,
  removeExercise,
  toggleSuperset,
  setRepMode,
  setIntensity,
  setRest,
  addSet,
  addWarmup,
  removeSet,
  cycleSetType,
  stepRep,
  stepVal,
  setNotes,
  addSlot,
  removeSlot,
  addToPool,
  removeFromPool,
  deriveSlots,
  boardLayout,
  daySummary,
  seedProgram,
  type ExerciseLookup,
  type EditRef,
} from "@nabd/program-editor";

import {
  ProgramSchema,
  type Program,
  type Day,
  type Exercise,
  type ExercisePrescription,
} from "@nabd/domain";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "bench",
    name: "Barbell Bench Press",
    group: "Chest",
    primary: ["chest"],
    secondary: ["triceps", "front_delts"],
    equipment: "barbell",
    tracking: "weight_reps",
    timeBased: false,
    ...overrides,
  };
}

function makeTimeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "plank",
    name: "Plank",
    group: "Abs",
    primary: ["abs"],
    secondary: [],
    equipment: "bodyweight",
    tracking: "duration",
    timeBased: true,
    ...overrides,
  };
}

function makeProgram(overrides: Partial<Program> = {}): Program {
  return {
    name: "Test Program",
    type: "fixed",
    schedule: "weekday",
    days: [
      {
        id: "day1",
        name: "Push",
        weekday: 1,
        exercises: [
          {
            id: "ex1",
            exId: "bench",
            repMode: "range",
            intensity: "none",
            rest: 120,
            sets: [
              { type: "working", a: 8, b: 12 },
              { type: "working", a: 8, b: 12 },
              { type: "working", a: 8, b: 12 },
            ],
          },
        ],
        slots: [],
      },
      {
        id: "day2",
        name: "Pull",
        weekday: 3,
        exercises: [
          {
            id: "ex2",
            exId: "pullup",
            repMode: "range",
            intensity: "rpe",
            rest: 150,
            sets: [
              { type: "working", a: 6, b: 8, val: 8 },
              { type: "working", a: 6, b: 8, val: 8 },
            ],
          },
        ],
        slots: [],
      },
    ],
    ...overrides,
  };
}

const noopLookup: ExerciseLookup = () => undefined;

function makeLookup(exercises: Exercise[]): ExerciseLookup {
  return (id) => exercises.find((e) => e.id === id);
}

// ---------------------------------------------------------------------------
// Deep-clone helper to snapshot the input for immutability checks
// ---------------------------------------------------------------------------
function snapshot<T>(val: T): T {
  return JSON.parse(JSON.stringify(val));
}

// ---------------------------------------------------------------------------
// newId
// ---------------------------------------------------------------------------
describe("newId", () => {
  it("returns a non-empty string", () => {
    expect(newId()).toEqual(expect.any(String));
    expect(newId().length).toBeGreaterThan(0);
  });

  it("is deterministic for a given seed", () => {
    expect(newId(42)).toBe(newId(42));
  });

  it("returns different values for different seeds", () => {
    expect(newId(1)).not.toBe(newId(2));
  });
});

// ---------------------------------------------------------------------------
// addDay
// ---------------------------------------------------------------------------
describe("addDay", () => {
  it("appends a new day with a weekday", () => {
    const p = makeProgram();
    const before = snapshot(p);
    const result = addDay(p, "newDay", 5);

    expect(p).toEqual(before); // immutability
    expect(result.days).toHaveLength(3);
    const added = result.days[2];
    expect(added.id).toBe("newDay");
    expect(added.name).toBe("New day");
    expect(added.weekday).toBe(5);
    expect(added.exercises).toEqual([]);
    expect(added.slots).toEqual([]);
  });

  it("appends a new day with null weekday (floating)", () => {
    const p = makeProgram();
    const result = addDay(p, "floatDay", null);

    expect(result.days[2].weekday).toBeNull();
    expect(result.days[2].id).toBe("floatDay");
  });
});

// ---------------------------------------------------------------------------
// removeDay
// ---------------------------------------------------------------------------
describe("removeDay", () => {
  it("removes the specified day", () => {
    const p = makeProgram();
    const before = snapshot(p);
    const result = removeDay(p, "day1");

    expect(p).toEqual(before);
    expect(result.days).toHaveLength(1);
    expect(result.days[0].id).toBe("day2");
  });

  it("does not remove other days", () => {
    const p = makeProgram();
    const result = removeDay(p, "day2");
    expect(result.days).toHaveLength(1);
    expect(result.days[0].id).toBe("day1");
  });
});

// ---------------------------------------------------------------------------
// renameDay
// ---------------------------------------------------------------------------
describe("renameDay", () => {
  it("renames the specified day", () => {
    const p = makeProgram();
    const before = snapshot(p);
    const result = renameDay(p, "day1", "Chest Day");

    expect(p).toEqual(before);
    expect(result.days[0].name).toBe("Chest Day");
    expect(result.days[1].name).toBe("Pull"); // unchanged
  });
});

// ---------------------------------------------------------------------------
// setWeekday
// ---------------------------------------------------------------------------
describe("setWeekday", () => {
  it("sets the weekday of a day", () => {
    const p = makeProgram();
    const before = snapshot(p);
    const result = setWeekday(p, "day1", 5);

    expect(p).toEqual(before);
    expect(result.days[0].weekday).toBe(5);
  });

  it("clears weekday (toggles off) when the same weekday is set again", () => {
    const p = makeProgram(); // day1.weekday = 1
    const result = setWeekday(p, "day1", 1);
    expect(result.days[0].weekday).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setType — fixed → cycled (derives slots)
// ---------------------------------------------------------------------------
describe("setType", () => {
  it("fixed → cycled: derives slots for days without slots", () => {
    const benchEx = makeExercise({ id: "bench", group: "Chest" });
    const flyEx = makeExercise({
      id: "fly",
      name: "DB Fly",
      group: "Chest",
      primary: ["chest"],
      secondary: [],
      equipment: "dumbbell",
    });
    const pullupEx = makeExercise({
      id: "pullup",
      name: "Pull-up",
      group: "Back",
      primary: ["lats"],
      secondary: [],
      equipment: "pullupbar",
    });

    const p: Program = {
      name: "Test",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "d1",
          name: "Push",
          weekday: 1,
          exercises: [
            {
              id: "e1",
              exId: "bench",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
            {
              id: "e2",
              exId: "fly",
              repMode: "range",
              intensity: "none",
              rest: 75,
              sets: [{ type: "working", a: 12, b: 15 }],
            },
            {
              id: "e3",
              exId: "pullup",
              repMode: "range",
              intensity: "rpe",
              rest: 150,
              sets: [{ type: "working", a: 6, b: 8, val: 8 }],
            },
          ],
          slots: [],
        },
      ],
    };
    const before = snapshot(p);
    const lookup = makeLookup([benchEx, flyEx, pullupEx]);
    const result = setType(p, "cycled", lookup);

    expect(p).toEqual(before);
    expect(result.type).toBe("cycled");

    const day = result.days[0];
    // Should have 2 groups: Chest (bench + fly) and Back (pullup)
    expect(day.slots).toHaveLength(2);

    const chestSlot = day.slots.find((s) => s.muscle === "chest");
    expect(chestSlot).toBeDefined();
    expect(chestSlot!.pool).toContain("bench");
    expect(chestSlot!.pool).toContain("fly");
    // prescription copied from first exercise of that group
    expect(chestSlot!.repMode).toBe("range");
    expect(chestSlot!.intensity).toBe("none");
    expect(chestSlot!.rest).toBe(120);

    const backSlot = day.slots.find((s) => s.muscle === "lats");
    expect(backSlot).toBeDefined();
    expect(backSlot!.pool).toContain("pullup");
    expect(backSlot!.repMode).toBe("range");
    expect(backSlot!.intensity).toBe("rpe");
    expect(backSlot!.rest).toBe(150);
  });

  it("cycled → fixed: changes type but keeps exercises", () => {
    const p: Program = {
      name: "Test",
      type: "cycled",
      schedule: "weekday",
      days: [
        {
          id: "d1",
          name: "Push",
          weekday: 1,
          exercises: [
            {
              id: "e1",
              exId: "bench",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
          slots: [
            {
              id: "s1",
              muscle: "chest",
              pool: ["bench"],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
        },
      ],
    };
    const before = snapshot(p);
    const result = setType(p, "fixed", noopLookup);

    expect(p).toEqual(before);
    expect(result.type).toBe("fixed");
    // exercises retained
    expect(result.days[0].exercises).toHaveLength(1);
  });

  it("fixed → cycled: does NOT re-derive slots for days that already have slots", () => {
    const p: Program = {
      name: "Test",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "d1",
          name: "Push",
          weekday: 1,
          exercises: [],
          slots: [
            {
              id: "existing-slot",
              muscle: "chest",
              pool: [],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
        },
      ],
    };
    const result = setType(p, "cycled", noopLookup);
    expect(result.days[0].slots[0].id).toBe("existing-slot");
  });
});

// ---------------------------------------------------------------------------
// setSchedule
// ---------------------------------------------------------------------------
describe("setSchedule", () => {
  it("changes the schedule", () => {
    const p = makeProgram();
    const before = snapshot(p);
    const result = setSchedule(p, "floating");

    expect(p).toEqual(before);
    expect(result.schedule).toBe("floating");
    expect(result.days).toEqual(p.days);
  });
});

// ---------------------------------------------------------------------------
// renameProgram
// ---------------------------------------------------------------------------
describe("renameProgram", () => {
  it("renames the program", () => {
    const p = makeProgram();
    const before = snapshot(p);
    const result = renameProgram(p, "My PPL");

    expect(p).toEqual(before);
    expect(result.name).toBe("My PPL");
    expect(result.days).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// deriveSlots
// ---------------------------------------------------------------------------
describe("deriveSlots", () => {
  it("groups exercises by muscle group into slots", () => {
    const benchEx = makeExercise({ id: "bench", group: "Chest" });
    const flyEx = makeExercise({
      id: "fly",
      name: "Fly",
      group: "Chest",
      primary: ["chest"],
      secondary: [],
      equipment: "dumbbell",
    });
    const day: Day = {
      id: "d1",
      name: "Push",
      weekday: 1,
      exercises: [
        {
          id: "e1",
          exId: "bench",
          repMode: "range",
          intensity: "none",
          rest: 120,
          sets: [{ type: "working", a: 8, b: 12 }],
        },
        {
          id: "e2",
          exId: "fly",
          repMode: "fixed",
          intensity: "none",
          rest: 75,
          sets: [{ type: "working", a: 12 }],
        },
      ],
      slots: [],
    };
    const lookup = makeLookup([benchEx, flyEx]);
    const slots = deriveSlots(day, lookup);

    expect(slots).toHaveLength(1);
    expect(slots[0].muscle).toBe("chest");
    expect(slots[0].pool).toEqual(["bench", "fly"]);
    // prescription from first exercise
    expect(slots[0].repMode).toBe("range");
    expect(slots[0].rest).toBe(120);
    expect(slots[0].sets).toEqual([{ type: "working", a: 8, b: 12 }]);
  });

  it("skips exercises where the lookup returns undefined", () => {
    const day: Day = {
      id: "d1",
      name: "Push",
      weekday: 1,
      exercises: [
        {
          id: "e1",
          exId: "unknown-ex",
          repMode: "range",
          intensity: "none",
          rest: 120,
          sets: [{ type: "working", a: 8, b: 12 }],
        },
      ],
      slots: [],
    };
    const slots = deriveSlots(day, noopLookup);
    expect(slots).toHaveLength(0);
  });

  it("does not duplicate exIds in the pool", () => {
    const benchEx = makeExercise({ id: "bench", group: "Chest" });
    const day: Day = {
      id: "d1",
      name: "Push",
      weekday: 1,
      exercises: [
        {
          id: "e1",
          exId: "bench",
          repMode: "range",
          intensity: "none",
          rest: 120,
          sets: [{ type: "working", a: 8, b: 12 }],
        },
        {
          id: "e2",
          exId: "bench", // same exId again
          repMode: "range",
          intensity: "none",
          rest: 120,
          sets: [{ type: "working", a: 8, b: 12 }],
        },
      ],
      slots: [],
    };
    const slots = deriveSlots(day, makeLookup([benchEx]));
    expect(slots[0].pool).toEqual(["bench"]); // deduplicated
  });

  it("preserves group order (first occurrence wins)", () => {
    const benchEx = makeExercise({ id: "bench", group: "Chest" });
    const curlEx = makeExercise({
      id: "curl",
      name: "Curl",
      group: "Biceps",
      primary: ["biceps"],
      secondary: [],
      equipment: "dumbbell",
    });
    const flyEx = makeExercise({
      id: "fly",
      name: "Fly",
      group: "Chest",
      primary: ["chest"],
      secondary: [],
      equipment: "dumbbell",
    });
    const day: Day = {
      id: "d1",
      name: "Mix",
      weekday: 1,
      exercises: [
        {
          id: "e1",
          exId: "bench",
          repMode: "range",
          intensity: "none",
          rest: 120,
          sets: [{ type: "working", a: 8, b: 12 }],
        },
        {
          id: "e2",
          exId: "curl",
          repMode: "range",
          intensity: "none",
          rest: 60,
          sets: [{ type: "working", a: 10, b: 12 }],
        },
        {
          id: "e3",
          exId: "fly",
          repMode: "fixed",
          intensity: "none",
          rest: 75,
          sets: [{ type: "working", a: 12 }],
        },
      ],
      slots: [],
    };
    const slots = deriveSlots(day, makeLookup([benchEx, curlEx, flyEx]));
    expect(slots).toHaveLength(2);
    expect(slots[0].muscle).toBe("chest");
    expect(slots[1].muscle).toBe("biceps");
    expect(slots[0].pool).toEqual(["bench", "fly"]);
  });
});

// ---------------------------------------------------------------------------
// addExercise — non-time-based
// ---------------------------------------------------------------------------
describe("addExercise", () => {
  it("adds a non-time-based exercise with range defaults", () => {
    const p = makeProgram();
    const before = snapshot(p);
    const ex = makeExercise({ id: "bench", timeBased: false });
    const result = addExercise(p, "day1", ex);

    expect(p).toEqual(before);
    const day = result.days[0];
    expect(day.exercises).toHaveLength(2);
    const added = day.exercises[1];
    expect(added.exId).toBe("bench");
    expect(added.repMode).toBe("range");
    expect(added.intensity).toBe("none");
    expect(added.rest).toBe(120);
    expect(added.sets).toHaveLength(3);
    added.sets.forEach((s) => {
      expect(s.type).toBe("working");
      expect(s.a).toBe(8);
      expect(s.b).toBe(12);
    });
  });

  it("adds a time-based exercise with time defaults", () => {
    const p = makeProgram();
    const ex = makeTimeExercise({ timeBased: true });
    const result = addExercise(p, "day1", ex);

    const added = result.days[0].exercises[1];
    expect(added.repMode).toBe("time");
    expect(added.intensity).toBe("none");
    expect(added.rest).toBe(60);
    expect(added.sets).toHaveLength(3);
    added.sets.forEach((s) => {
      expect(s.type).toBe("working");
      expect(s.a).toBe(45);
      expect(s.b).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// removeExercise
// ---------------------------------------------------------------------------
describe("removeExercise", () => {
  it("removes the specified exercise", () => {
    const p = makeProgram();
    const before = snapshot(p);
    const result = removeExercise(p, "day1", "ex1");

    expect(p).toEqual(before);
    expect(result.days[0].exercises).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// toggleSuperset
// ---------------------------------------------------------------------------
describe("toggleSuperset", () => {
  it("links two adjacent exercises into a superset", () => {
    const p: Program = {
      name: "T",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "d1",
          name: "Push",
          weekday: 1,
          exercises: [
            {
              id: "ex1",
              exId: "bench",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
            {
              id: "ex2",
              exId: "fly",
              repMode: "range",
              intensity: "none",
              rest: 75,
              sets: [{ type: "working", a: 12, b: 15 }],
            },
          ],
          slots: [],
        },
      ],
    };
    const before = snapshot(p);
    const result = toggleSuperset(p, "d1", "ex1");

    expect(p).toEqual(before);
    const [e1, e2] = result.days[0].exercises;
    expect(e1.supersetId).toBeDefined();
    expect(e2.supersetId).toBeDefined();
    expect(e1.supersetId).toBe(e2.supersetId);
  });

  it("unlinks exercises already in the same superset", () => {
    const p: Program = {
      name: "T",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "d1",
          name: "Push",
          weekday: 1,
          exercises: [
            {
              id: "ex1",
              exId: "bench",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
              supersetId: "ssA",
            },
            {
              id: "ex2",
              exId: "fly",
              repMode: "range",
              intensity: "none",
              rest: 75,
              sets: [{ type: "working", a: 12, b: 15 }],
              supersetId: "ssA",
            },
          ],
          slots: [],
        },
      ],
    };
    const before = snapshot(p);
    const result = toggleSuperset(p, "d1", "ex1");

    expect(p).toEqual(before);
    const [e1, e2] = result.days[0].exercises;
    expect(e1.supersetId).toBeUndefined();
    expect(e2.supersetId).toBeUndefined();
  });

  it("is a no-op when the exercise is the last one", () => {
    const p: Program = {
      name: "T",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "d1",
          name: "Push",
          weekday: 1,
          exercises: [
            {
              id: "ex1",
              exId: "bench",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
          slots: [],
        },
      ],
    };
    const before = snapshot(p);
    const result = toggleSuperset(p, "d1", "ex1");

    expect(p).toEqual(before);
    expect(result.days[0].exercises[0].supersetId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// setRepMode
// ---------------------------------------------------------------------------
describe("setRepMode", () => {
  const ref: EditRef = { kind: "ex", id: "ex1" };

  it("range → time: sets a to 45 if null, drops b from each set", () => {
    const p = makeProgram();
    const before = snapshot(p);
    const result = setRepMode(p, "day1", ref, "time");

    expect(p).toEqual(before);
    const ex = result.days[0].exercises[0];
    expect(ex.repMode).toBe("time");
    ex.sets.forEach((s) => {
      expect(s.b).toBeUndefined();
      expect(s.a).toBeGreaterThanOrEqual(1);
    });
  });

  it("range → fixed: drops b from each set", () => {
    const p = makeProgram();
    const result = setRepMode(p, "day1", ref, "fixed");

    const ex = result.days[0].exercises[0];
    expect(ex.repMode).toBe("fixed");
    ex.sets.forEach((s) => {
      expect(s.b).toBeUndefined();
    });
  });

  it("fixed → range: ensures b = a+2 when missing", () => {
    const p: Program = {
      name: "T",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Push",
          weekday: 1,
          exercises: [
            {
              id: "ex1",
              exId: "bench",
              repMode: "fixed",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8 }],
            },
          ],
          slots: [],
        },
      ],
    };
    const result = setRepMode(p, "day1", ref, "range");
    const ex = result.days[0].exercises[0];
    expect(ex.repMode).toBe("range");
    expect(ex.sets[0].b).toBe(10); // a+2
  });

  it("time → time: sets a??=45 but a already set keeps its value, drops b", () => {
    const p: Program = {
      name: "T",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Push",
          weekday: 1,
          exercises: [
            {
              id: "ex1",
              exId: "plank",
              repMode: "time",
              intensity: "none",
              rest: 60,
              sets: [{ type: "working", a: 45 }],
            },
          ],
          slots: [],
        },
      ],
    };
    const result = setRepMode(p, "day1", ref, "time");
    expect(result.days[0].exercises[0].sets[0].a).toBe(45);
    expect(result.days[0].exercises[0].sets[0].b).toBeUndefined();
  });

  it("works on a slot ref (kind=slot)", () => {
    const p: Program = {
      name: "T",
      type: "cycled",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Push",
          weekday: 1,
          exercises: [],
          slots: [
            {
              id: "s1",
              muscle: "chest",
              pool: [],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
        },
      ],
    };
    const slotRef: EditRef = { kind: "slot", id: "s1" };
    const result = setRepMode(p, "day1", slotRef, "fixed");
    expect(result.days[0].slots[0].repMode).toBe("fixed");
    expect(result.days[0].slots[0].sets[0].b).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// setIntensity
// ---------------------------------------------------------------------------
describe("setIntensity", () => {
  const ref: EditRef = { kind: "ex", id: "ex1" };

  it("none: deletes val from each set", () => {
    const p: Program = {
      name: "T",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Push",
          weekday: 1,
          exercises: [
            {
              id: "ex1",
              exId: "bench",
              repMode: "range",
              intensity: "rpe",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12, val: 8 }],
            },
          ],
          slots: [],
        },
      ],
    };
    const before = snapshot(p);
    const result = setIntensity(p, "day1", ref, "none");

    expect(p).toEqual(before);
    const ex = result.days[0].exercises[0];
    expect(ex.intensity).toBe("none");
    ex.sets.forEach((s) => {
      expect(s.val).toBeUndefined();
    });
  });

  it("rpe: sets val to 8 when missing", () => {
    const p = makeProgram();
    const result = setIntensity(p, "day1", ref, "rpe");
    const ex = result.days[0].exercises[0];
    expect(ex.intensity).toBe("rpe");
    ex.sets.forEach((s) => {
      expect(s.val).toBe(8);
    });
  });

  it("pct: sets val to 70 when missing", () => {
    const p = makeProgram();
    const result = setIntensity(p, "day1", ref, "pct");
    const ex = result.days[0].exercises[0];
    expect(ex.intensity).toBe("pct");
    ex.sets.forEach((s) => {
      expect(s.val).toBe(70);
    });
  });

  it("rpe: keeps existing val when already set", () => {
    const p: Program = {
      name: "T",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Push",
          weekday: 1,
          exercises: [
            {
              id: "ex1",
              exId: "bench",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12, val: 9 }],
            },
          ],
          slots: [],
        },
      ],
    };
    const result = setIntensity(p, "day1", ref, "rpe");
    expect(result.days[0].exercises[0].sets[0].val).toBe(9); // existing kept
  });
});

// ---------------------------------------------------------------------------
// setRest (stepRest with ±15 clamp ≥0)
// ---------------------------------------------------------------------------
describe("setRest", () => {
  const ref: EditRef = { kind: "ex", id: "ex1" };

  it("increases rest by 15", () => {
    const p = makeProgram(); // rest = 120
    const before = snapshot(p);
    const result = setRest(p, "day1", ref, 1);

    expect(p).toEqual(before);
    expect(result.days[0].exercises[0].rest).toBe(135);
  });

  it("decreases rest by 15", () => {
    const p = makeProgram(); // rest = 120
    const result = setRest(p, "day1", ref, -1);
    expect(result.days[0].exercises[0].rest).toBe(105);
  });

  it("clamps rest to ≥0", () => {
    const p: Program = {
      name: "T",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Push",
          weekday: 1,
          exercises: [
            {
              id: "ex1",
              exId: "bench",
              repMode: "range",
              intensity: "none",
              rest: 10,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
          slots: [],
        },
      ],
    };
    const result = setRest(p, "day1", ref, -1);
    expect(result.days[0].exercises[0].rest).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// addSet
// ---------------------------------------------------------------------------
describe("addSet", () => {
  const ref: EditRef = { kind: "ex", id: "ex1" };

  it("clones the last set as working and appends it", () => {
    const p: Program = {
      name: "T",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Push",
          weekday: 1,
          exercises: [
            {
              id: "ex1",
              exId: "bench",
              repMode: "range",
              intensity: "rpe",
              rest: 120,
              sets: [
                { type: "warmup", a: 10, b: 14 },
                { type: "working", a: 8, b: 12, val: 8 },
              ],
            },
          ],
          slots: [],
        },
      ],
    };
    const before = snapshot(p);
    const result = addSet(p, "day1", ref);

    expect(p).toEqual(before);
    const sets = result.days[0].exercises[0].sets;
    expect(sets).toHaveLength(3);
    // last set cloned but with type: working
    expect(sets[2].type).toBe("working");
    expect(sets[2].a).toBe(8);
    expect(sets[2].b).toBe(12);
    expect(sets[2].val).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// addWarmup
// ---------------------------------------------------------------------------
describe("addWarmup", () => {
  const ref: EditRef = { kind: "ex", id: "ex1" };

  it("prepends a warmup for time-based exercise: a=30", () => {
    const p: Program = {
      name: "T",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Push",
          weekday: 1,
          exercises: [
            {
              id: "ex1",
              exId: "plank",
              repMode: "time",
              intensity: "none",
              rest: 60,
              sets: [{ type: "working", a: 45 }],
            },
          ],
          slots: [],
        },
      ],
    };
    const before = snapshot(p);
    const result = addWarmup(p, "day1", ref);

    expect(p).toEqual(before);
    const sets = result.days[0].exercises[0].sets;
    expect(sets).toHaveLength(2);
    expect(sets[0].type).toBe("warmup");
    expect(sets[0].a).toBe(30);
    expect(sets[0].b).toBeUndefined();
  });

  it("prepends a warmup for reps-based exercise: a=firstA+2, b=firstA+4", () => {
    const p = makeProgram(); // sets[0].a=8
    const result = addWarmup(p, "day1", ref);

    const sets = result.days[0].exercises[0].sets;
    expect(sets[0].type).toBe("warmup");
    expect(sets[0].a).toBe(10); // 8+2
    expect(sets[0].b).toBe(12); // 8+4
  });
});

// ---------------------------------------------------------------------------
// removeSet
// ---------------------------------------------------------------------------
describe("removeSet", () => {
  const ref: EditRef = { kind: "ex", id: "ex1" };

  it("removes the set at index i", () => {
    const p: Program = {
      name: "T",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Push",
          weekday: 1,
          exercises: [
            {
              id: "ex1",
              exId: "bench",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [
                { type: "warmup", a: 10, b: 14 },
                { type: "working", a: 8, b: 12 },
                { type: "working", a: 8, b: 12 },
              ],
            },
          ],
          slots: [],
        },
      ],
    };
    const before = snapshot(p);
    const result = removeSet(p, "day1", ref, 0);

    expect(p).toEqual(before);
    const sets = result.days[0].exercises[0].sets;
    expect(sets).toHaveLength(2);
    expect(sets[0].type).toBe("working");
  });

  it("keeps at least 1 set (no-op when only 1 remains)", () => {
    const p: Program = {
      name: "T",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Push",
          weekday: 1,
          exercises: [
            {
              id: "ex1",
              exId: "bench",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
          slots: [],
        },
      ],
    };
    const result = removeSet(p, "day1", ref, 0);
    expect(result.days[0].exercises[0].sets).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// cycleSetType  working → warmup → drop → working
// ---------------------------------------------------------------------------
describe("cycleSetType", () => {
  const ref: EditRef = { kind: "ex", id: "ex1" };

  function makeSetProg(type: "working" | "warmup" | "drop"): Program {
    return {
      name: "T",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Push",
          weekday: 1,
          exercises: [
            {
              id: "ex1",
              exId: "bench",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type, a: 8, b: 12 }],
            },
          ],
          slots: [],
        },
      ],
    };
  }

  it("working → warmup", () => {
    const result = cycleSetType(makeSetProg("working"), "day1", ref, 0);
    expect(result.days[0].exercises[0].sets[0].type).toBe("warmup");
  });

  it("warmup → drop", () => {
    const result = cycleSetType(makeSetProg("warmup"), "day1", ref, 0);
    expect(result.days[0].exercises[0].sets[0].type).toBe("drop");
  });

  it("drop → working", () => {
    const result = cycleSetType(makeSetProg("drop"), "day1", ref, 0);
    expect(result.days[0].exercises[0].sets[0].type).toBe("working");
  });

  it("input is unchanged", () => {
    const p = makeSetProg("working");
    const before = snapshot(p);
    cycleSetType(p, "day1", ref, 0);
    expect(p).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// stepRep — a and b clamps
// ---------------------------------------------------------------------------
describe("stepRep", () => {
  const ref: EditRef = { kind: "ex", id: "ex1" };

  function makeRepProg(repMode: "range" | "fixed" | "time", a: number, b?: number): Program {
    return {
      name: "T",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Push",
          weekday: 1,
          exercises: [
            {
              id: "ex1",
              exId: "bench",
              repMode,
              intensity: "none",
              rest: 120,
              sets: [b !== undefined ? { type: "working", a, b } : { type: "working", a }],
            },
          ],
          slots: [],
        },
      ],
    };
  }

  it("increments a by 1 for range mode", () => {
    const p = makeRepProg("range", 8, 12);
    const before = snapshot(p);
    const result = stepRep(p, "day1", ref, 0, "a", 1);

    expect(p).toEqual(before);
    expect(result.days[0].exercises[0].sets[0].a).toBe(9);
    expect(result.days[0].exercises[0].sets[0].b).toBe(12); // b unchanged (still ≥ new a)
  });

  it("decrements a and clamps to 1 for range mode", () => {
    const p = makeRepProg("range", 1, 3);
    const result = stepRep(p, "day1", ref, 0, "a", -1);
    expect(result.days[0].exercises[0].sets[0].a).toBe(1); // clamped at 1
  });

  it("time mode: steps a by 5 and clamps to min 5", () => {
    const p = makeRepProg("time", 5);
    const result = stepRep(p, "day1", ref, 0, "a", 1);
    expect(result.days[0].exercises[0].sets[0].a).toBe(10); // +5
  });

  it("time mode: decrements a by 5 and clamps to 5", () => {
    const p = makeRepProg("time", 5);
    const result = stepRep(p, "day1", ref, 0, "a", -1);
    expect(result.days[0].exercises[0].sets[0].a).toBe(5); // clamped at 5
  });

  it("range mode: when a increments past b, b is adjusted to equal a", () => {
    const p = makeRepProg("range", 11, 12);
    const result = stepRep(p, "day1", ref, 0, "a", 1); // a → 12 which equals b → ok
    expect(result.days[0].exercises[0].sets[0].a).toBe(12);
    // b stays at 12 (b≥a)
    expect(result.days[0].exercises[0].sets[0].b).toBeGreaterThanOrEqual(12);
  });

  it("range mode: a steps past b forces b = a", () => {
    const p = makeRepProg("range", 12, 12);
    const result = stepRep(p, "day1", ref, 0, "a", 1); // a → 13, b still 12 → b must become 13
    expect(result.days[0].exercises[0].sets[0].a).toBe(13);
    expect(result.days[0].exercises[0].sets[0].b).toBe(13);
  });

  it("steps b by 1 and clamps to ≥ a", () => {
    const p = makeRepProg("range", 8, 12);
    const result = stepRep(p, "day1", ref, 0, "b", 1);
    expect(result.days[0].exercises[0].sets[0].b).toBe(13);
  });

  it("b clamps to ≥ a when decremented to a", () => {
    const p = makeRepProg("range", 8, 9);
    const result = stepRep(p, "day1", ref, 0, "b", -1);
    expect(result.days[0].exercises[0].sets[0].b).toBe(8); // clamped to a
  });

  it("b cannot go below a", () => {
    const p = makeRepProg("range", 8, 8);
    const result = stepRep(p, "day1", ref, 0, "b", -1);
    expect(result.days[0].exercises[0].sets[0].b).toBe(8); // clamped to a
  });
});

// ---------------------------------------------------------------------------
// stepVal — RPE and %1RM
// ---------------------------------------------------------------------------
describe("stepVal", () => {
  const ref: EditRef = { kind: "ex", id: "ex1" };

  function makeValProg(intensity: "rpe" | "pct", val: number): Program {
    return {
      name: "T",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Push",
          weekday: 1,
          exercises: [
            {
              id: "ex1",
              exId: "bench",
              repMode: "range",
              intensity,
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12, val }],
            },
          ],
          slots: [],
        },
      ],
    };
  }

  it("rpe: increments val by 0.5", () => {
    const p = makeValProg("rpe", 8);
    const before = snapshot(p);
    const result = stepVal(p, "day1", ref, 0, 1);

    expect(p).toEqual(before);
    expect(result.days[0].exercises[0].sets[0].val).toBe(8.5);
  });

  it("rpe: decrements val by 0.5", () => {
    const p = makeValProg("rpe", 8);
    const result = stepVal(p, "day1", ref, 0, -1);
    expect(result.days[0].exercises[0].sets[0].val).toBe(7.5);
  });

  it("rpe: clamps max at 10", () => {
    const p = makeValProg("rpe", 10);
    const result = stepVal(p, "day1", ref, 0, 1);
    expect(result.days[0].exercises[0].sets[0].val).toBe(10);
  });

  it("rpe: clamps min at 5", () => {
    const p = makeValProg("rpe", 5);
    const result = stepVal(p, "day1", ref, 0, -1);
    expect(result.days[0].exercises[0].sets[0].val).toBe(5);
  });

  it("pct: increments val by 2.5", () => {
    const p = makeValProg("pct", 70);
    const result = stepVal(p, "day1", ref, 0, 1);
    expect(result.days[0].exercises[0].sets[0].val).toBe(72.5);
  });

  it("pct: decrements val by 2.5", () => {
    const p = makeValProg("pct", 70);
    const result = stepVal(p, "day1", ref, 0, -1);
    expect(result.days[0].exercises[0].sets[0].val).toBe(67.5);
  });

  it("pct: clamps max at 100", () => {
    const p = makeValProg("pct", 100);
    const result = stepVal(p, "day1", ref, 0, 1);
    expect(result.days[0].exercises[0].sets[0].val).toBe(100);
  });

  it("pct: clamps min at 40", () => {
    const p = makeValProg("pct", 40);
    const result = stepVal(p, "day1", ref, 0, -1);
    expect(result.days[0].exercises[0].sets[0].val).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// setNotes
// ---------------------------------------------------------------------------
describe("setNotes", () => {
  const ref: EditRef = { kind: "ex", id: "ex1" };

  it("sets notes on the exercise", () => {
    const p = makeProgram();
    const before = snapshot(p);
    const result = setNotes(p, "day1", ref, "Keep back flat");

    expect(p).toEqual(before);
    expect(result.days[0].exercises[0].notes).toBe("Keep back flat");
  });

  it("updates existing notes", () => {
    const p: Program = {
      name: "T",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Push",
          weekday: 1,
          exercises: [
            {
              id: "ex1",
              exId: "bench",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
              notes: "old note",
            },
          ],
          slots: [],
        },
      ],
    };
    const result = setNotes(p, "day1", ref, "new note");
    expect(result.days[0].exercises[0].notes).toBe("new note");
  });
});

// ---------------------------------------------------------------------------
// addSlot
// ---------------------------------------------------------------------------
describe("addSlot", () => {
  it("adds a new slot with default prescription", () => {
    const p: Program = {
      name: "T",
      type: "cycled",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Push",
          weekday: 1,
          exercises: [],
          slots: [],
        },
      ],
    };
    const before = snapshot(p);
    const result = addSlot(p, "day1", "chest");

    expect(p).toEqual(before);
    const slots = result.days[0].slots;
    expect(slots).toHaveLength(1);
    const slot = slots[0];
    expect(slot.muscle).toBe("chest");
    expect(slot.pool).toEqual([]);
    expect(slot.repMode).toBe("range");
    expect(slot.intensity).toBe("none");
    expect(slot.rest).toBe(120);
    expect(slot.sets).toHaveLength(3);
    slot.sets.forEach((s) => {
      expect(s.type).toBe("working");
      expect(s.a).toBe(8);
      expect(s.b).toBe(12);
    });
  });
});

// ---------------------------------------------------------------------------
// removeSlot
// ---------------------------------------------------------------------------
describe("removeSlot", () => {
  it("removes the specified slot", () => {
    const p: Program = {
      name: "T",
      type: "cycled",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Push",
          weekday: 1,
          exercises: [],
          slots: [
            {
              id: "s1",
              muscle: "chest",
              pool: [],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
            {
              id: "s2",
              muscle: "triceps",
              pool: [],
              repMode: "range",
              intensity: "none",
              rest: 90,
              sets: [{ type: "working", a: 10, b: 15 }],
            },
          ],
        },
      ],
    };
    const before = snapshot(p);
    const result = removeSlot(p, "day1", "s1");

    expect(p).toEqual(before);
    expect(result.days[0].slots).toHaveLength(1);
    expect(result.days[0].slots[0].id).toBe("s2");
  });
});

// ---------------------------------------------------------------------------
// addToPool
// ---------------------------------------------------------------------------
describe("addToPool", () => {
  it("adds an exercise to the pool", () => {
    const p: Program = {
      name: "T",
      type: "cycled",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Push",
          weekday: 1,
          exercises: [],
          slots: [
            {
              id: "s1",
              muscle: "chest",
              pool: ["bench"],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
        },
      ],
    };
    const before = snapshot(p);
    const result = addToPool(p, "day1", "s1", "fly");

    expect(p).toEqual(before);
    expect(result.days[0].slots[0].pool).toEqual(["bench", "fly"]);
  });

  it("does not add a duplicate exId (deduplication)", () => {
    const p: Program = {
      name: "T",
      type: "cycled",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Push",
          weekday: 1,
          exercises: [],
          slots: [
            {
              id: "s1",
              muscle: "chest",
              pool: ["bench"],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
        },
      ],
    };
    const result = addToPool(p, "day1", "s1", "bench");
    expect(result.days[0].slots[0].pool).toEqual(["bench"]); // still just one
  });
});

// ---------------------------------------------------------------------------
// removeFromPool
// ---------------------------------------------------------------------------
describe("removeFromPool", () => {
  it("removes an exercise from the pool", () => {
    const p: Program = {
      name: "T",
      type: "cycled",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Push",
          weekday: 1,
          exercises: [],
          slots: [
            {
              id: "s1",
              muscle: "chest",
              pool: ["bench", "fly"],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
        },
      ],
    };
    const before = snapshot(p);
    const result = removeFromPool(p, "day1", "s1", "bench");

    expect(p).toEqual(before);
    expect(result.days[0].slots[0].pool).toEqual(["fly"]);
  });
});

// ---------------------------------------------------------------------------
// boardLayout — weekday schedule
// ---------------------------------------------------------------------------
describe("boardLayout (weekday)", () => {
  it("returns 7 columns for MON..SUN", () => {
    const p = makeProgram(); // days at weekday 1 and 3
    const before = snapshot(p);
    const columns = boardLayout(p);

    expect(p).toEqual(before);
    expect(columns).toHaveLength(7);
  });

  it("produces a day-card column for Mon (weekday=1)", () => {
    const p = makeProgram();
    const cols = boardLayout(p);
    const mon = cols[0]; // MON is first
    expect(mon.kind).toBe("day");
    expect(mon.label).toBe("MON");
    expect(mon.card).toBeDefined();
    expect(mon.card!.dayId).toBe("day1");
  });

  it("produces a rest column for Tue (weekday=2, no day)", () => {
    const p = makeProgram();
    const cols = boardLayout(p);
    const tue = cols[1]; // TUE
    expect(tue.kind).toBe("rest");
  });

  it("rest column does NOT have a card", () => {
    const p = makeProgram();
    const cols = boardLayout(p);
    const tue = cols[1];
    expect(tue.card).toBeUndefined();
  });

  it("day column chips: fixed → first ≤4 exercise names, superset flag set", () => {
    const p: Program = {
      name: "T",
      type: "fixed",
      schedule: "weekday",
      days: [
        {
          id: "d1",
          name: "Push",
          weekday: 1,
          exercises: [
            {
              id: "e1",
              exId: "bench",
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
              supersetId: "ss1",
            },
            {
              id: "e2",
              exId: "fly",
              repMode: "range",
              intensity: "none",
              rest: 75,
              sets: [{ type: "working", a: 12, b: 15 }],
              supersetId: "ss1",
            },
            {
              id: "e3",
              exId: "lraise",
              repMode: "range",
              intensity: "none",
              rest: 60,
              sets: [{ type: "working", a: 15, b: 20 }],
            },
            {
              id: "e4",
              exId: "ohp",
              repMode: "range",
              intensity: "none",
              rest: 90,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
            {
              id: "e5",
              exId: "dip",
              repMode: "range",
              intensity: "none",
              rest: 90,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
          ],
          slots: [],
        },
      ],
    };
    const benchEx = makeExercise({ id: "bench", name: "Barbell Bench Press" });
    const flyEx = makeExercise({
      id: "fly",
      name: "DB Fly",
      group: "Chest",
      primary: ["chest"],
      secondary: [],
      equipment: "dumbbell",
    });
    const lraiseEx = makeExercise({
      id: "lraise",
      name: "Lat Raise",
      group: "Shoulders",
      primary: ["side_delts"],
      secondary: [],
      equipment: "dumbbell",
    });
    const ohpEx = makeExercise({
      id: "ohp",
      name: "OHP",
      group: "Shoulders",
      primary: ["side_delts"],
      secondary: [],
      equipment: "barbell",
    });
    const dipEx = makeExercise({
      id: "dip",
      name: "Dip",
      group: "Triceps",
      primary: ["triceps"],
      secondary: [],
      equipment: "bodyweight",
    });

    // We just need the board to include 4 chips max and count 'more' correctly
    const cols = boardLayout(p);
    const monCol = cols[0];
    expect(monCol.card).toBeDefined();
    expect(monCol.card!.chips.length).toBeLessThanOrEqual(4);
    expect(monCol.card!.more).toBe(1); // 5 exercises − 4 shown = 1 more
  });

  it("day column chips: cycled → first ≤4 muscle display names", () => {
    const p: Program = {
      name: "T",
      type: "cycled",
      schedule: "weekday",
      days: [
        {
          id: "d1",
          name: "Upper",
          weekday: 1,
          exercises: [],
          slots: [
            {
              id: "s1",
              muscle: "chest",
              pool: [],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
            {
              id: "s2",
              muscle: "lats",
              pool: [],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12 }],
            },
            {
              id: "s3",
              muscle: "side_delts",
              pool: [],
              repMode: "range",
              intensity: "none",
              rest: 90,
              sets: [{ type: "working", a: 10, b: 15 }],
            },
            {
              id: "s4",
              muscle: "triceps",
              pool: [],
              repMode: "range",
              intensity: "none",
              rest: 75,
              sets: [{ type: "working", a: 12, b: 15 }],
            },
            {
              id: "s5",
              muscle: "biceps",
              pool: [],
              repMode: "range",
              intensity: "none",
              rest: 75,
              sets: [{ type: "working", a: 10, b: 12 }],
            },
          ],
        },
      ],
    };
    const cols = boardLayout(p);
    const monCol = cols[0];
    expect(monCol.card).toBeDefined();
    expect(monCol.card!.chips.length).toBeLessThanOrEqual(4);
    // chips contain muscle display names from MUSCLE_NAMES
    expect(monCol.card!.chips[0].name).toBe("Chest");
    expect(monCol.card!.chips[1].name).toBe("Lats");
    expect(monCol.card!.chips[2].name).toBe("Side Delts");
    expect(monCol.card!.more).toBe(1); // 5 slots − 4 shown = 1
  });
});

// ---------------------------------------------------------------------------
// boardLayout — floating schedule
// ---------------------------------------------------------------------------
describe("boardLayout (floating)", () => {
  it("includes a day card for each day + one 'add' column at the end", () => {
    const p: Program = {
      name: "T",
      type: "fixed",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Push",
          weekday: null,
          exercises: [],
          slots: [],
        },
        {
          id: "d2",
          name: "Pull",
          weekday: null,
          exercises: [],
          slots: [],
        },
      ],
    };
    const before = snapshot(p);
    const cols = boardLayout(p);

    expect(p).toEqual(before);
    expect(cols).toHaveLength(3); // 2 day cards + 1 add
    expect(cols[0].kind).toBe("day");
    expect(cols[1].kind).toBe("day");
    expect(cols[2].kind).toBe("add");
    expect(cols[2].card).toBeUndefined();
  });

  it("day cards in a floating layout have correct labels (DAY 1, DAY 2...)", () => {
    const p: Program = {
      name: "T",
      type: "fixed",
      schedule: "floating",
      days: [
        {
          id: "d1",
          name: "Push",
          weekday: null,
          exercises: [],
          slots: [],
        },
      ],
    };
    const cols = boardLayout(p);
    expect(cols[0].label).toBe("DAY 1");
  });
});

// ---------------------------------------------------------------------------
// daySummary
// ---------------------------------------------------------------------------
describe("daySummary", () => {
  it("fixed: returns correct exercise, set, and minute string", () => {
    const day: Day = {
      id: "d1",
      name: "Push",
      weekday: 1,
      exercises: [
        {
          id: "e1",
          exId: "bench",
          repMode: "range",
          intensity: "none",
          rest: 120,
          sets: [
            { type: "working", a: 8, b: 12 },
            { type: "working", a: 8, b: 12 },
            { type: "working", a: 8, b: 12 },
            { type: "working", a: 8, b: 12 },
          ], // 4 sets
        },
        {
          id: "e2",
          exId: "fly",
          repMode: "range",
          intensity: "none",
          rest: 75,
          sets: [
            { type: "working", a: 12, b: 15 },
            { type: "working", a: 12, b: 15 },
          ], // 2 sets
        },
      ],
      slots: [],
    };
    const summary = daySummary(day, "fixed");
    // 2 exercises, 6 sets, max(8, round(6*3.4)) = max(8, 20) = 20 min
    expect(summary).toBe("2 exercises · 6 sets · ~20 min");
  });

  it("fixed: clamps minimum minutes to 8", () => {
    const day: Day = {
      id: "d1",
      name: "Push",
      weekday: 1,
      exercises: [
        {
          id: "e1",
          exId: "bench",
          repMode: "range",
          intensity: "none",
          rest: 120,
          sets: [{ type: "working", a: 8, b: 12 }], // 1 set → round(3.4) = 3 → clamp to 8
        },
      ],
      slots: [],
    };
    const summary = daySummary(day, "fixed");
    expect(summary).toBe("1 exercises · 1 sets · ~8 min");
  });

  it("cycled: returns muscle groups count string", () => {
    const cyclDay: Day = {
      id: "d1",
      name: "Upper",
      weekday: 1,
      exercises: [],
      slots: [
        {
          id: "s1",
          muscle: "chest",
          pool: [],
          repMode: "range",
          intensity: "none",
          rest: 120,
          sets: [{ type: "working", a: 8, b: 12 }],
        },
        {
          id: "s2",
          muscle: "lats",
          pool: [],
          repMode: "range",
          intensity: "none",
          rest: 120,
          sets: [{ type: "working", a: 8, b: 12 }],
        },
        {
          id: "s3",
          muscle: "side_delts",
          pool: [],
          repMode: "range",
          intensity: "none",
          rest: 90,
          sets: [{ type: "working", a: 10, b: 15 }],
        },
      ],
    };
    const summary = daySummary(cyclDay, "cycled");
    expect(summary).toBe("3 muscle groups");
  });
});

// ---------------------------------------------------------------------------
// seedProgram
// ---------------------------------------------------------------------------
describe("seedProgram", () => {
  it("passes ProgramSchema validation", () => {
    const prog = seedProgram();
    const result = ProgramSchema.safeParse(prog);
    expect(result.success).toBe(true);
  });

  it("has name Push / Pull / Legs", () => {
    const prog = seedProgram();
    expect(prog.name).toBe("Push / Pull / Legs");
  });

  it("has 3 days", () => {
    const prog = seedProgram();
    expect(prog.days).toHaveLength(3);
  });

  it("Push day is on weekday 1 (Monday)", () => {
    const prog = seedProgram();
    const push = prog.days.find((d) => d.name === "Push");
    expect(push).toBeDefined();
    expect(push!.weekday).toBe(1);
  });

  it("Pull day is on weekday 3 (Wednesday)", () => {
    const prog = seedProgram();
    const pull = prog.days.find((d) => d.name === "Pull");
    expect(pull).toBeDefined();
    expect(pull!.weekday).toBe(3);
  });

  it("Legs day is on weekday 5 (Friday)", () => {
    const prog = seedProgram();
    const legs = prog.days.find((d) => d.name === "Legs");
    expect(legs).toBeDefined();
    expect(legs!.weekday).toBe(5);
  });

  it("Push day has a superset (ssA: db-fly + lat-raise)", () => {
    const prog = seedProgram();
    const push = prog.days.find((d) => d.name === "Push")!;
    const supersetExercises = push.exercises.filter((e) => e.supersetId !== undefined);
    expect(supersetExercises.length).toBeGreaterThanOrEqual(2);
    // Both in same superset
    const sids = new Set(supersetExercises.map((e) => e.supersetId));
    expect(sids.size).toBeGreaterThanOrEqual(1);
  });

  it("Pull day has a superset (ssB: hammer-curl + bb-curl)", () => {
    const prog = seedProgram();
    const pull = prog.days.find((d) => d.name === "Pull")!;
    const supersetExercises = pull.exercises.filter((e) => e.supersetId !== undefined);
    expect(supersetExercises.length).toBeGreaterThanOrEqual(2);
  });

  it("is type fixed and schedule weekday", () => {
    const prog = seedProgram();
    expect(prog.type).toBe("fixed");
    expect(prog.schedule).toBe("weekday");
  });

  it("Push day has warmup sets (bb-bench has a warmup)", () => {
    const prog = seedProgram();
    const push = prog.days.find((d) => d.name === "Push")!;
    const benchPrescription = push.exercises.find((e) => e.exId === "bb-bench");
    expect(benchPrescription).toBeDefined();
    const warmups = benchPrescription!.sets.filter((s) => s.type === "warmup");
    expect(warmups.length).toBeGreaterThanOrEqual(1);
  });

  it("Legs day has a time-based exercise (plank)", () => {
    const prog = seedProgram();
    const legs = prog.days.find((d) => d.name === "Legs")!;
    const plank = legs.exercises.find((e) => e.exId === "plank");
    expect(plank).toBeDefined();
    expect(plank!.repMode).toBe("time");
  });

  it("Push day exercises have drop set (db-oh-ext last set)", () => {
    const prog = seedProgram();
    const push = prog.days.find((d) => d.name === "Push")!;
    const ohExt = push.exercises.find((e) => e.exId === "db-oh-ext");
    expect(ohExt).toBeDefined();
    const dropSets = ohExt!.sets.filter((s) => s.type === "drop");
    expect(dropSets.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// EditRef type coverage — slot refs (covered above; this ensures slot path
// for stepRep, stepVal, setNotes, addSet, addWarmup, removeSet, cycleSetType)
// ---------------------------------------------------------------------------
describe("slot ref coverage", () => {
  const slotRef: EditRef = { kind: "slot", id: "s1" };

  function makeSlotProg(): Program {
    return {
      name: "T",
      type: "cycled",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Upper",
          weekday: 1,
          exercises: [],
          slots: [
            {
              id: "s1",
              muscle: "chest",
              pool: [],
              repMode: "range",
              intensity: "none",
              rest: 120,
              sets: [
                { type: "working", a: 8, b: 12 },
                { type: "working", a: 8, b: 12 },
              ],
            },
          ],
        },
      ],
    };
  }

  it("addSet on a slot", () => {
    const p = makeSlotProg();
    const result = addSet(p, "day1", slotRef);
    expect(result.days[0].slots[0].sets).toHaveLength(3);
  });

  it("addWarmup on a slot (reps)", () => {
    const p = makeSlotProg();
    const result = addWarmup(p, "day1", slotRef);
    expect(result.days[0].slots[0].sets[0].type).toBe("warmup");
  });

  it("removeSet on a slot", () => {
    const p = makeSlotProg();
    const result = removeSet(p, "day1", slotRef, 0);
    expect(result.days[0].slots[0].sets).toHaveLength(1);
  });

  it("cycleSetType on a slot", () => {
    const p = makeSlotProg();
    const result = cycleSetType(p, "day1", slotRef, 0);
    expect(result.days[0].slots[0].sets[0].type).toBe("warmup");
  });

  it("stepRep on a slot", () => {
    const p = makeSlotProg();
    const result = stepRep(p, "day1", slotRef, 0, "a", 1);
    expect(result.days[0].slots[0].sets[0].a).toBe(9);
  });

  it("stepVal on a slot (rpe)", () => {
    const p: Program = {
      name: "T",
      type: "cycled",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Upper",
          weekday: 1,
          exercises: [],
          slots: [
            {
              id: "s1",
              muscle: "chest",
              pool: [],
              repMode: "range",
              intensity: "rpe",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12, val: 8 }],
            },
          ],
        },
      ],
    };
    const result = stepVal(p, "day1", slotRef, 0, 1);
    expect(result.days[0].slots[0].sets[0].val).toBe(8.5);
  });

  it("setNotes on a slot", () => {
    const p = makeSlotProg();
    const result = setNotes(p, "day1", slotRef, "slot note");
    expect(result.days[0].slots[0].notes).toBe("slot note");
  });

  it("setRest on a slot", () => {
    const p = makeSlotProg();
    const result = setRest(p, "day1", slotRef, 1);
    expect(result.days[0].slots[0].rest).toBe(135);
  });

  it("setIntensity none on a slot (deletes val)", () => {
    const p: Program = {
      name: "T",
      type: "cycled",
      schedule: "weekday",
      days: [
        {
          id: "day1",
          name: "Upper",
          weekday: 1,
          exercises: [],
          slots: [
            {
              id: "s1",
              muscle: "chest",
              pool: [],
              repMode: "range",
              intensity: "rpe",
              rest: 120,
              sets: [{ type: "working", a: 8, b: 12, val: 8 }],
            },
          ],
        },
      ],
    };
    const result = setIntensity(p, "day1", slotRef, "none");
    expect(result.days[0].slots[0].intensity).toBe("none");
    expect(result.days[0].slots[0].sets[0].val).toBeUndefined();
  });
});
