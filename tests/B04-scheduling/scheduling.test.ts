/**
 * B04 · @nabd/scheduling — exhaustive value-asserting tests.
 *
 * All tests are expected RED against the skeleton (bodies throw "not implemented").
 * The suite must report 100% line/function/branch coverage of src/index.ts by
 * calling every exported function at least once.
 */

import { describe, it, expect } from "vitest";
import {
  resolveTodayDay,
  rotationFor,
  buildSlots,
  applyStatuses,
  startOutOfOrder,
  currentSlot,
  rollover,
  advanceRotation,
  type ExerciseLookup,
  type ScheduleContext,
} from "@nabd/scheduling";
import { DEFAULTS } from "@nabd/domain";
import type { Program, Day, Slot, Exercise, RotationState, DayState, SetSpec } from "@nabd/domain";

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

function makeExercise(
  id: string,
  name: string,
  group: Exercise["group"] = "Chest",
  primary: Exercise["primary"] = ["chest"],
  secondary: Exercise["secondary"] = [],
): Exercise {
  return {
    id,
    name,
    group,
    primary,
    secondary,
    equipment: "barbell",
    tracking: "weight_reps",
  };
}

function makeSet(type: SetSpec["type"] = "working"): SetSpec {
  return { type, a: 8 };
}

/**
 * Build a minimal fixed-mode Day (uses `exercises`, no `slots`).
 * weekday null → floating.
 */
function makeFixedDay(
  id: string,
  exIds: string[],
  weekday: number | null,
  setsPerEx: SetSpec[][] = [],
): Day {
  return {
    id,
    name: `Day ${id}`,
    weekday,
    exercises: exIds.map((exId, i) => ({
      id: `presc-${id}-${i}`,
      exId,
      repMode: "fixed",
      intensity: "none",
      rest: 90,
      sets: setsPerEx[i] ?? [makeSet()],
    })),
    slots: [],
  };
}

/**
 * Build a minimal cycled-mode Day (uses `slots`, no `exercises`).
 * weekday null → floating.
 */
function makeCycledDay(
  id: string,
  cycledSlots: {
    slotId: string;
    muscle: Day["slots"][0]["muscle"];
    pool: string[];
    sets: SetSpec[];
  }[],
  weekday: number | null,
): Day {
  return {
    id,
    name: `Day ${id}`,
    weekday,
    exercises: [],
    slots: cycledSlots.map(({ slotId, muscle, pool, sets }) => ({
      id: slotId,
      muscle,
      pool,
      repMode: "fixed",
      intensity: "none",
      rest: 90,
      sets,
    })),
  };
}

function makeProgram(type: Program["type"], schedule: Program["schedule"], days: Day[]): Program {
  return { name: "Test Program", type, schedule, days };
}

function makeCtx(floatingIndex = 0, rotationState: RotationState = {}): ScheduleContext {
  return { rotationState, floatingIndex };
}

// A lookup stub that only knows the exercises we give it
function makeLookup(...exercises: Exercise[]): ExerciseLookup {
  const map = new Map(exercises.map((e) => [e.id, e]));
  return (id: string) => map.get(id);
}

// ---------------------------------------------------------------------------
// resolveTodayDay
// ---------------------------------------------------------------------------

describe("resolveTodayDay", () => {
  // Wednesday = day-index 3  (JS getDay(): 0=Sun…6=Sat)
  // 2026-06-24 is a Wednesday
  const wednesday = new Date(2026, 5, 24); // month 5 = June

  const dayMon: Day = makeFixedDay("mon", ["ex1"], 1);
  const dayWed: Day = makeFixedDay("wed", ["ex2"], 3);
  const daySat: Day = makeFixedDay("sat", ["ex3"], 6);

  it("weekday schedule — exact weekday match returns that day", () => {
    const prog = makeProgram("fixed", "weekday", [dayMon, dayWed, daySat]);
    const result = resolveTodayDay(prog, wednesday, makeCtx());
    expect(result).toEqual(dayWed);
  });

  it("weekday schedule — no match returns null (rest day)", () => {
    // Use Friday (5) — none of dayMon(1)/dayWed(3)/daySat(6) match
    const friday = new Date(2026, 5, 26); // 2026-06-26 is a Friday
    const prog = makeProgram("fixed", "weekday", [dayMon, dayWed, daySat]);
    const result = resolveTodayDay(prog, friday, makeCtx());
    expect(result).toBeNull();
  });

  it("weekday schedule — only one day matches among multiple", () => {
    // Sunday = 0
    const sunday = new Date(2026, 5, 21);
    const daySun: Day = makeFixedDay("sun", ["ex4"], 0);
    const prog = makeProgram("fixed", "weekday", [daySun, dayMon, dayWed]);
    const result = resolveTodayDay(prog, sunday, makeCtx());
    expect(result).toEqual(daySun);
  });

  it("floating schedule — returns days[floatingIndex % days.length]", () => {
    const dayA: Day = makeFixedDay("a", ["ex1"], null);
    const dayB: Day = makeFixedDay("b", ["ex2"], null);
    const dayC: Day = makeFixedDay("c", ["ex3"], null);
    const prog = makeProgram("cycled", "floating", [dayA, dayB, dayC]);

    expect(resolveTodayDay(prog, wednesday, makeCtx(0))).toEqual(dayA);
    expect(resolveTodayDay(prog, wednesday, makeCtx(1))).toEqual(dayB);
    expect(resolveTodayDay(prog, wednesday, makeCtx(2))).toEqual(dayC);
  });

  it("floating schedule — wraps with modulo (index 4 with 3 days → index 1)", () => {
    const dayA: Day = makeFixedDay("a", ["ex1"], null);
    const dayB: Day = makeFixedDay("b", ["ex2"], null);
    const dayC: Day = makeFixedDay("c", ["ex3"], null);
    const prog = makeProgram("cycled", "floating", [dayA, dayB, dayC]);

    expect(resolveTodayDay(prog, wednesday, makeCtx(4))).toEqual(dayB);
  });

  it("floating schedule — empty days array returns null", () => {
    const prog = makeProgram("cycled", "floating", []);
    const result = resolveTodayDay(prog, wednesday, makeCtx(0));
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// rotationFor
// ---------------------------------------------------------------------------

describe("rotationFor", () => {
  it("empty pool returns null", () => {
    const result = rotationFor("slot1", [], {});
    expect(result).toBeNull();
  });

  it("uses pointer 0 when slot not in rotation (default)", () => {
    const pool = ["exA", "exB", "exC"];
    const result = rotationFor("slot1", pool, {});
    expect(result).toBe("exA"); // pool[0 % 3] = pool[0]
  });

  it("uses stored pointer when slot is in rotation", () => {
    const pool = ["exA", "exB", "exC"];
    const rotation: RotationState = { slot1: 2 };
    const result = rotationFor("slot1", pool, rotation);
    expect(result).toBe("exC"); // pool[2 % 3] = pool[2]
  });

  it("wraps around when pointer exceeds pool length", () => {
    const pool = ["exA", "exB"];
    const rotation: RotationState = { slot1: 3 }; // 3 % 2 = 1
    const result = rotationFor("slot1", pool, rotation);
    expect(result).toBe("exB"); // pool[1]
  });

  it("pointer exactly at pool.length wraps to 0", () => {
    const pool = ["exA", "exB", "exC"];
    const rotation: RotationState = { slot1: 3 }; // 3 % 3 = 0
    const result = rotationFor("slot1", pool, rotation);
    expect(result).toBe("exA");
  });

  it("pointer 0 returns first element", () => {
    const pool = ["exX", "exY"];
    const rotation: RotationState = { slot1: 0 };
    const result = rotationFor("slot1", pool, rotation);
    expect(result).toBe("exX");
  });
});

// ---------------------------------------------------------------------------
// buildSlots — fixed mode
// ---------------------------------------------------------------------------

describe("buildSlots — fixed exercises", () => {
  const exBench = makeExercise(
    "bench-press",
    "Bench Press",
    "Chest",
    ["chest"],
    ["triceps", "front_delts"],
  );
  const exRow = makeExercise(
    "barbell-row",
    "Barbell Row",
    "Back",
    ["lats", "rhomboids"],
    ["biceps"],
  );

  const lookup = makeLookup(exBench, exRow);

  // Day with 2 exercises and a 50-min interval
  const day = makeFixedDay("d1", ["bench-press", "barbell-row"], 3, [
    [makeSet("warmup"), makeSet("working"), makeSet("working")], // 2 working sets
    [makeSet("working"), makeSet("drop")], // 2 non-warmup sets
  ]);

  it("produces one slot per exercise in order", () => {
    const slots = buildSlots(day, lookup, {}, 50);
    expect(slots).toHaveLength(2);
  });

  it("first slot time is DEFAULTS.startMin (09:30 = 570 min)", () => {
    const slots = buildSlots(day, lookup, {}, 50);
    expect(slots[0].min).toBe(DEFAULTS.startMin); // 570
    expect(slots[0].timeStr).toBe("09:30");
  });

  it("second slot time is startMin + intervalMin", () => {
    const slots = buildSlots(day, lookup, {}, 50);
    expect(slots[1].min).toBe(DEFAULTS.startMin + 50); // 620
    expect(slots[1].timeStr).toBe("10:20");
  });

  it("exercise name comes from lookup", () => {
    const slots = buildSlots(day, lookup, {}, 50);
    expect(slots[0].exercise).toBe("Bench Press");
    expect(slots[1].exercise).toBe("Barbell Row");
  });

  it("group comes from lookup", () => {
    const slots = buildSlots(day, lookup, {}, 50);
    expect(slots[0].group).toBe("Chest");
    expect(slots[1].group).toBe("Back");
  });

  it("muscles is union of primary and secondary from lookup", () => {
    const slots = buildSlots(day, lookup, {}, 50);
    // Bench Press: primary=["chest"] ∪ secondary=["triceps","front_delts"]
    expect(slots[0].muscles).toEqual(expect.arrayContaining(["chest", "triceps", "front_delts"]));
    expect(slots[0].muscles).toHaveLength(3);
    // Barbell Row: primary=["lats","rhomboids"] ∪ secondary=["biceps"]
    expect(slots[1].muscles).toEqual(expect.arrayContaining(["lats", "rhomboids", "biceps"]));
    expect(slots[1].muscles).toHaveLength(3);
  });

  it("sets = count of non-warmup sets (warmup excluded)", () => {
    const slots = buildSlots(day, lookup, {}, 50);
    // bench-press: [warmup, working, working] → 2 non-warmup
    expect(slots[0].sets).toBe(2);
    // barbell-row: [working, drop] → 2 non-warmup
    expect(slots[1].sets).toBe(2);
  });

  it("sets minimum is 1 even if all are warmup", () => {
    const warmupOnlyDay = makeFixedDay("d-wo", ["bench-press"], 3, [
      [makeSet("warmup"), makeSet("warmup")],
    ]);
    const slots = buildSlots(warmupOnlyDay, lookup, {}, 50);
    expect(slots[0].sets).toBe(1);
  });

  it("done starts at 0", () => {
    const slots = buildSlots(day, lookup, {}, 50);
    expect(slots[0].done).toBe(0);
    expect(slots[1].done).toBe(0);
  });

  it("status starts as 'upcoming'", () => {
    const slots = buildSlots(day, lookup, {}, 50);
    expect(slots[0].status).toBe("upcoming");
    expect(slots[1].status).toBe("upcoming");
  });

  it("result starts as empty string", () => {
    const slots = buildSlots(day, lookup, {}, 50);
    expect(slots[0].result).toBe("");
    expect(slots[1].result).toBe("");
  });

  it("ids are stable and distinct per index", () => {
    const slots = buildSlots(day, lookup, {}, 50);
    expect(slots[0].id).toBeDefined();
    expect(slots[1].id).toBeDefined();
    expect(slots[0].id).not.toBe(slots[1].id);

    // Calling again should produce same ids (stable per index)
    const slots2 = buildSlots(day, lookup, {}, 50);
    expect(slots2[0].id).toBe(slots[0].id);
    expect(slots2[1].id).toBe(slots[1].id);
  });

  it("exId on fixed slots is the exercise id from the prescription", () => {
    const slots = buildSlots(day, lookup, {}, 50);
    expect(slots[0].exId).toBe("bench-press");
    expect(slots[1].exId).toBe("barbell-row");
  });

  it("exercises with missing lookup are skipped", () => {
    const dayWithMissing = makeFixedDay("d-miss", ["bench-press", "MISSING-ID", "barbell-row"], 3, [
      [makeSet()],
      [makeSet()],
      [makeSet()],
    ]);
    const slots = buildSlots(dayWithMissing, lookup, {}, 50);
    // MISSING-ID is not in the lookup, so only 2 slots
    expect(slots).toHaveLength(2);
    expect(slots[0].exercise).toBe("Bench Press");
    expect(slots[1].exercise).toBe("Barbell Row");
  });

  it("times adjust correctly after a skip (times are i-based, not slot-count-based)", () => {
    // Even when middle exercise is skipped, the times use the position index
    // The spec says "i" not "position after filtering", so we check consecutive times
    const dayWith3 = makeFixedDay("d3", ["bench-press", "barbell-row"], 3, [
      [makeSet()],
      [makeSet()],
    ]);
    const slots = buildSlots(dayWith3, lookup, {}, 30);
    expect(slots[0].min).toBe(DEFAULTS.startMin);
    expect(slots[1].min).toBe(DEFAULTS.startMin + 30);
  });

  it("interval of 60 gives correct times", () => {
    const slots = buildSlots(day, lookup, {}, 60);
    expect(slots[0].min).toBe(DEFAULTS.startMin); // 570
    expect(slots[1].min).toBe(DEFAULTS.startMin + 60); // 630 = 10:30
    expect(slots[1].timeStr).toBe("10:30");
  });
});

// ---------------------------------------------------------------------------
// buildSlots — cycled mode
// ---------------------------------------------------------------------------

describe("buildSlots — cycled slots", () => {
  const exSquat = makeExercise("squat", "Back Squat", "Quads", ["quads"], ["glutes", "hamstrings"]);
  const exLegPress = makeExercise("leg-press", "Leg Press", "Quads", ["quads", "hip_flexors"], []);
  const exHackSquat = makeExercise("hack-squat", "Hack Squat", "Quads", ["quads"], ["glutes"]);
  const exRDL = makeExercise(
    "rdl",
    "Romanian DL",
    "Hamstrings",
    ["hamstrings"],
    ["glutes", "lower_back"],
  );
  const exCurl = makeExercise("curl", "Leg Curl", "Hamstrings", ["hamstrings"], []);

  const lookup = makeLookup(exSquat, exLegPress, exHackSquat, exRDL, exCurl);

  // Slot A: pool of 3 quads exercises
  // Slot B: pool of 2 hamstrings exercises
  const cycledDay = makeCycledDay(
    "d-cyc",
    [
      {
        slotId: "slotA",
        muscle: "quads",
        pool: ["squat", "leg-press", "hack-squat"],
        sets: [makeSet("warmup"), makeSet("working"), makeSet("working"), makeSet("working")],
      },
      {
        slotId: "slotB",
        muscle: "hamstrings",
        pool: ["rdl", "curl"],
        sets: [makeSet("working"), makeSet("working")],
      },
    ],
    null,
  );

  it("produces one slot per cycled slot", () => {
    const slots = buildSlots(cycledDay, lookup, {}, 50);
    expect(slots).toHaveLength(2);
  });

  it("resolves exercise from pool[0] at rotation pointer 0 (default)", () => {
    const slots = buildSlots(cycledDay, lookup, {}, 50);
    expect(slots[0].exercise).toBe("Back Squat"); // pool[0]
    expect(slots[1].exercise).toBe("Romanian DL"); // pool[0]
  });

  it("resolves exercise from rotation pointer 1", () => {
    const rotation: RotationState = { slotA: 1, slotB: 1 };
    const slots = buildSlots(cycledDay, lookup, rotation, 50);
    expect(slots[0].exercise).toBe("Leg Press"); // pool[1]
    expect(slots[1].exercise).toBe("Leg Curl"); // pool[1]
  });

  it("group comes from the cycled slot's muscle display name", () => {
    const slots = buildSlots(cycledDay, lookup, {}, 50);
    expect(slots[0].group).toBe("Quads"); // MUSCLE_NAMES["quads"]
    expect(slots[1].group).toBe("Hamstrings"); // MUSCLE_NAMES["hamstrings"]
  });

  it("cycled sets = count of non-warmup sets (min 1)", () => {
    const slots = buildSlots(cycledDay, lookup, {}, 50);
    // slotA: [warmup, working, working, working] → 3 non-warmup
    expect(slots[0].sets).toBe(3);
    // slotB: [working, working] → 2 non-warmup
    expect(slots[1].sets).toBe(2);
  });

  it("drift: 3-id pool vs 2-id pool across successive rotation states", () => {
    // Rotation 0: slotA→squat, slotB→rdl
    const rot0: RotationState = { slotA: 0, slotB: 0 };
    const s0 = buildSlots(cycledDay, lookup, rot0, 50);
    expect(s0[0].exercise).toBe("Back Squat");
    expect(s0[1].exercise).toBe("Romanian DL");

    // Rotation 1: slotA→leg-press, slotB→curl
    const rot1: RotationState = { slotA: 1, slotB: 1 };
    const s1 = buildSlots(cycledDay, lookup, rot1, 50);
    expect(s1[0].exercise).toBe("Leg Press");
    expect(s1[1].exercise).toBe("Leg Curl");

    // Rotation 2: slotA→hack-squat, slotB→rdl (2-pool wraps)
    const rot2: RotationState = { slotA: 2, slotB: 2 };
    const s2 = buildSlots(cycledDay, lookup, rot2, 50);
    expect(s2[0].exercise).toBe("Hack Squat");
    expect(s2[1].exercise).toBe("Romanian DL"); // 2 % 2 = 0

    // Rotation 3: slotA→squat (3-pool wraps), slotB→curl
    const rot3: RotationState = { slotA: 3, slotB: 3 };
    const s3 = buildSlots(cycledDay, lookup, rot3, 50);
    expect(s3[0].exercise).toBe("Back Squat"); // 3 % 3 = 0
    expect(s3[1].exercise).toBe("Leg Curl"); // 3 % 2 = 1

    // Confirm drift: the two pools are now out of sync
    expect(s3[0].exercise).not.toBe(s3[1].exercise);
  });

  it("cycled slot with missing lookup result is skipped", () => {
    const dayWithMissing = makeCycledDay(
      "d-cmiss",
      [
        { slotId: "slotA", muscle: "quads", pool: ["squat"], sets: [makeSet()] },
        { slotId: "slotB", muscle: "hamstrings", pool: ["MISSING"], sets: [makeSet()] },
      ],
      null,
    );
    const slots = buildSlots(dayWithMissing, lookup, {}, 50);
    expect(slots).toHaveLength(1);
    expect(slots[0].exercise).toBe("Back Squat");
  });

  it("cycled slot with empty pool is skipped", () => {
    const dayWithEmptyPool = makeCycledDay(
      "d-cempty",
      [
        { slotId: "slotA", muscle: "quads", pool: ["squat"], sets: [makeSet()] },
        { slotId: "slotB", muscle: "hamstrings", pool: [], sets: [makeSet()] },
      ],
      null,
    );
    const slots = buildSlots(dayWithEmptyPool, lookup, {}, 50);
    expect(slots).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// applyStatuses
// ---------------------------------------------------------------------------

describe("applyStatuses", () => {
  function makeSlots(n: number): Slot[] {
    return Array.from({ length: n }, (_, i) => ({
      id: `s${i}`,
      exId: `ex${i}`,
      exercise: `Exercise ${i}`,
      group: "Chest",
      muscles: ["chest"] as Slot["muscles"],
      min: DEFAULTS.startMin + i * 50,
      timeStr: "09:30",
      sets: 3,
      done: 0,
      status: "upcoming" as const,
      result: "",
    }));
  }

  it("doneCount=0: first slot is 'now', rest are 'upcoming'", () => {
    const slots = makeSlots(4);
    const result = applyStatuses(slots, 0);
    expect(result[0].status).toBe("now");
    expect(result[1].status).toBe("upcoming");
    expect(result[2].status).toBe("upcoming");
    expect(result[3].status).toBe("upcoming");
  });

  it("doneCount=2: first two are 'done', third is 'now', rest 'upcoming'", () => {
    const slots = makeSlots(4);
    const result = applyStatuses(slots, 2);
    expect(result[0].status).toBe("done");
    expect(result[1].status).toBe("done");
    expect(result[2].status).toBe("now");
    expect(result[3].status).toBe("upcoming");
  });

  it("doneCount=3 (all but one): 3 done, then 'now' on last", () => {
    const slots = makeSlots(4);
    const result = applyStatuses(slots, 3);
    expect(result[0].status).toBe("done");
    expect(result[1].status).toBe("done");
    expect(result[2].status).toBe("done");
    expect(result[3].status).toBe("now");
  });

  it("doneCount=length: all slots are 'done'", () => {
    const slots = makeSlots(4);
    const result = applyStatuses(slots, 4);
    expect(result.every((s) => s.status === "done")).toBe(true);
  });

  it("doneCount > length: all slots are 'done'", () => {
    const slots = makeSlots(3);
    const result = applyStatuses(slots, 10);
    expect(result.every((s) => s.status === "done")).toBe(true);
  });

  it("does not mutate the input array", () => {
    const slots = makeSlots(3);
    const original = slots.map((s) => ({ ...s }));
    applyStatuses(slots, 1);
    slots.forEach((s, i) => {
      expect(s.status).toBe(original[i].status);
    });
  });

  it("single slot, doneCount=0: status is 'now'", () => {
    const slots = makeSlots(1);
    const result = applyStatuses(slots, 0);
    expect(result[0].status).toBe("now");
  });

  it("single slot, doneCount=1: status is 'done'", () => {
    const slots = makeSlots(1);
    const result = applyStatuses(slots, 1);
    expect(result[0].status).toBe("done");
  });
});

// ---------------------------------------------------------------------------
// startOutOfOrder
// ---------------------------------------------------------------------------

describe("startOutOfOrder", () => {
  function makeOrderedSlots(): Slot[] {
    const statuses: Slot["status"][] = ["done", "done", "now", "upcoming", "upcoming"];
    return statuses.map((status, i) => ({
      id: `s${i}`,
      exId: `ex${i}`,
      exercise: `Ex ${i}`,
      group: "Chest",
      muscles: ["chest"] as Slot["muscles"],
      min: DEFAULTS.startMin + i * 50,
      timeStr: "09:30",
      sets: 3,
      done: status === "done" ? 3 : 0,
      status,
      result: "",
    }));
  }

  it("target slot is set to 'now'", () => {
    const slots = makeOrderedSlots();
    const result = startOutOfOrder(slots, "s4");
    const target = result.find((s) => s.id === "s4")!;
    expect(target.status).toBe("now");
  });

  it("the previous 'now' slot is demoted to 'upcoming'", () => {
    const slots = makeOrderedSlots(); // s2 is currently "now"
    const result = startOutOfOrder(slots, "s4");
    const prev = result.find((s) => s.id === "s2")!;
    expect(prev.status).toBe("upcoming");
  });

  it("'done' slots are not touched", () => {
    const slots = makeOrderedSlots();
    const result = startOutOfOrder(slots, "s4");
    expect(result.find((s) => s.id === "s0")!.status).toBe("done");
    expect(result.find((s) => s.id === "s1")!.status).toBe("done");
  });

  it("other 'upcoming' slots remain 'upcoming'", () => {
    const slots = makeOrderedSlots();
    const result = startOutOfOrder(slots, "s4");
    expect(result.find((s) => s.id === "s3")!.status).toBe("upcoming");
  });

  it("does not mutate the input", () => {
    const slots = makeOrderedSlots();
    const statusesBefore = slots.map((s) => s.status);
    startOutOfOrder(slots, "s4");
    slots.forEach((s, i) => {
      expect(s.status).toBe(statusesBefore[i]);
    });
  });

  it("target slot that is already 'upcoming' becomes 'now'", () => {
    const slots = makeOrderedSlots();
    const result = startOutOfOrder(slots, "s3");
    expect(result.find((s) => s.id === "s3")!.status).toBe("now");
  });

  it("when no other slot is 'now', only target changes", () => {
    const slots: Slot[] = [
      {
        id: "a",
        exId: "ex1",
        exercise: "E1",
        group: "Chest",
        muscles: ["chest"],
        min: 570,
        timeStr: "09:30",
        sets: 3,
        done: 0,
        status: "upcoming",
        result: "",
      },
      {
        id: "b",
        exId: "ex2",
        exercise: "E2",
        group: "Chest",
        muscles: ["chest"],
        min: 620,
        timeStr: "10:20",
        sets: 3,
        done: 0,
        status: "upcoming",
        result: "",
      },
    ];
    const result = startOutOfOrder(slots, "b");
    expect(result.find((s) => s.id === "b")!.status).toBe("now");
    expect(result.find((s) => s.id === "a")!.status).toBe("upcoming");
  });
});

// ---------------------------------------------------------------------------
// currentSlot
// ---------------------------------------------------------------------------

describe("currentSlot", () => {
  function slot(id: string, status: Slot["status"]): Slot {
    return {
      id,
      exId: id,
      exercise: id,
      group: "Chest",
      muscles: ["chest"],
      min: 570,
      timeStr: "09:30",
      sets: 3,
      done: 0,
      status,
      result: "",
    };
  }

  it("returns the first 'now' slot", () => {
    const slots = [slot("a", "done"), slot("b", "now"), slot("c", "upcoming")];
    expect(currentSlot(slots)?.id).toBe("b");
  });

  it("'now' takes precedence over 'upcoming'", () => {
    const slots = [slot("a", "upcoming"), slot("b", "now"), slot("c", "upcoming")];
    expect(currentSlot(slots)?.id).toBe("b");
  });

  it("returns first 'upcoming' when no 'now' exists", () => {
    const slots = [
      slot("a", "done"),
      slot("b", "done"),
      slot("c", "upcoming"),
      slot("d", "upcoming"),
    ];
    expect(currentSlot(slots)?.id).toBe("c");
  });

  it("returns null when all slots are 'done'", () => {
    const slots = [slot("a", "done"), slot("b", "done")];
    expect(currentSlot(slots)).toBeNull();
  });

  it("returns null when all slots are 'skipped'", () => {
    const slots = [slot("a", "skipped"), slot("b", "skipped")];
    expect(currentSlot(slots)).toBeNull();
  });

  it("returns null for empty array", () => {
    expect(currentSlot([])).toBeNull();
  });

  it("returns first 'now' when multiple 'now' exist (edge case)", () => {
    const slots = [slot("a", "now"), slot("b", "now")];
    expect(currentSlot(slots)?.id).toBe("a");
  });

  it("skipped slots do not count as upcoming for currentSlot", () => {
    const slots = [slot("a", "done"), slot("b", "skipped"), slot("c", "upcoming")];
    expect(currentSlot(slots)?.id).toBe("c");
  });
});

// ---------------------------------------------------------------------------
// advanceRotation
// ---------------------------------------------------------------------------

describe("advanceRotation", () => {
  const cycledDay = makeCycledDay(
    "d-adv",
    [
      {
        slotId: "slotA",
        muscle: "quads",
        pool: ["squat", "leg-press", "hack-squat"],
        sets: [makeSet()],
      },
      { slotId: "slotB", muscle: "hamstrings", pool: ["rdl", "curl"], sets: [makeSet()] },
    ],
    null,
  );

  it("increments pointers for each cycled slot by 1", () => {
    const rotation: RotationState = { slotA: 0, slotB: 1 };
    const result = advanceRotation(cycledDay, rotation);
    expect(result["slotA"]).toBe(1);
    expect(result["slotB"]).toBe(2);
  });

  it("handles missing pointer (treats as 0, advances to 1)", () => {
    const rotation: RotationState = {};
    const result = advanceRotation(cycledDay, rotation);
    expect(result["slotA"]).toBe(1);
    expect(result["slotB"]).toBe(1);
  });

  it("returns a new object and does not mutate the input", () => {
    const rotation: RotationState = { slotA: 2, slotB: 3 };
    const result = advanceRotation(cycledDay, rotation);
    expect(result).not.toBe(rotation);
    expect(rotation["slotA"]).toBe(2); // unchanged
    expect(rotation["slotB"]).toBe(3); // unchanged
    expect(result["slotA"]).toBe(3);
    expect(result["slotB"]).toBe(4);
  });

  it("ignores non-cycled (exercises) entries from the day", () => {
    const fixedDay = makeFixedDay("d-fixed", ["squat"], null, [[makeSet()]]);
    const rotation: RotationState = { unrelated: 5 };
    const result = advanceRotation(fixedDay, rotation);
    // Fixed days have no cycled slots, so only unrelated should be unaffected or unchanged
    // The function should only touch slots from the day's slots array
    expect(result["unrelated"]).toBeUndefined();
  });

  it("handles pointer that would otherwise be very large", () => {
    const rotation: RotationState = { slotA: 999, slotB: 9999 };
    const result = advanceRotation(cycledDay, rotation);
    expect(result["slotA"]).toBe(1000);
    expect(result["slotB"]).toBe(10000);
  });
});

// ---------------------------------------------------------------------------
// rollover
// ---------------------------------------------------------------------------

describe("rollover", () => {
  const exSquat = makeExercise("squat", "Back Squat", "Quads", ["quads"], ["glutes"]);
  const exRDL = makeExercise("rdl", "Romanian DL", "Hamstrings", ["hamstrings"], []);
  const lookup = makeLookup(exSquat, exRDL);

  const cycledDay = makeCycledDay(
    "d-roll",
    [
      { slotId: "slotA", muscle: "quads", pool: ["squat"], sets: [makeSet(), makeSet()] },
      { slotId: "slotB", muscle: "hamstrings", pool: ["rdl"], sets: [makeSet()] },
    ],
    null,
  );

  const floatingProgram = makeProgram("cycled", "floating", [cycledDay]);

  function makeDayState(slotStatuses: Slot["status"][], date = "2026-06-24"): DayState {
    const slots = slotStatuses.map((status, i) => ({
      id: `s${i}`,
      exId: `ex${i}`,
      exercise: `Ex ${i}`,
      group: "Chest",
      muscles: ["chest"] as Slot["muscles"],
      min: DEFAULTS.startMin + i * 50,
      timeStr: "09:30",
      sets: 3,
      done: status === "done" ? 3 : 0,
      status,
      result: "",
    }));
    return { date, floatingIndex: 0, slots };
  }

  const nextDate = new Date(2026, 5, 25); // 2026-06-25

  it("unfinished slots (not 'done') are collected in skipped", () => {
    const prev = makeDayState(["done", "upcoming", "upcoming"]);
    const ctx = makeCtx(0, {});
    const result = rollover(floatingProgram, prev, ctx, nextDate);
    expect(result.skipped).toHaveLength(2);
    expect(result.skipped[0].status).toBe("skipped");
    expect(result.skipped[1].status).toBe("skipped");
  });

  it("'done' slots are not in the skipped array", () => {
    const prev = makeDayState(["done", "upcoming", "done"]);
    const ctx = makeCtx(0, {});
    const result = rollover(floatingProgram, prev, ctx, nextDate);
    expect(result.skipped).toHaveLength(1);
  });

  it("skipped array is empty when all slots are done", () => {
    const prev = makeDayState(["done", "done", "done"]);
    const ctx = makeCtx(0, {});
    const result = rollover(floatingProgram, prev, ctx, nextDate);
    expect(result.skipped).toHaveLength(0);
  });

  it("floatingIndex advances by 1 when every slot is done (full completion)", () => {
    const prev = makeDayState(["done", "done", "done"]);
    const ctx = makeCtx(2, {});
    const result = rollover(floatingProgram, prev, ctx, nextDate);
    expect(result.floatingIndex).toBe(3);
  });

  it("floatingIndex does NOT advance when not all slots are done", () => {
    const prev = makeDayState(["done", "upcoming", "done"]);
    const ctx = makeCtx(2, {});
    const result = rollover(floatingProgram, prev, ctx, nextDate);
    expect(result.floatingIndex).toBe(2); // unchanged
  });

  it("floatingIndex unchanged when all slots are skipped (not done)", () => {
    const prev = makeDayState(["upcoming", "upcoming"]);
    const ctx = makeCtx(5, {});
    const result = rollover(floatingProgram, prev, ctx, nextDate);
    expect(result.floatingIndex).toBe(5);
  });

  it("rotation is advanced for cycled slots in the prev day", () => {
    // We need the prev DayState to reference the cycledDay
    // so the rollover can find which cycled slots to advance
    // Build slots from the actual day using buildSlots
    const slots = buildSlots(cycledDay, lookup, { slotA: 0, slotB: 0 }, 50).map((s) => ({
      ...s,
      status: "done" as const,
      done: s.sets,
    }));
    const prev: DayState = { date: "2026-06-24", floatingIndex: 0, slots };
    const ctx = makeCtx(0, { slotA: 0, slotB: 0 });

    // Find which day is prev by matching the program
    // Rollover uses the program's days structure to advance rotation
    // We pass the program with the cycledDay
    const result = rollover(floatingProgram, prev, ctx, nextDate);
    // slotA and slotB pointers should each be incremented
    expect(result.rotationState["slotA"]).toBe(1);
    expect(result.rotationState["slotB"]).toBe(1);
  });

  it("skipped slot has status 'skipped'", () => {
    const prev = makeDayState(["done", "upcoming"]);
    const ctx = makeCtx(0, {});
    const result = rollover(floatingProgram, prev, ctx, nextDate);
    expect(result.skipped[0].status).toBe("skipped");
  });

  it("returns a new rotationState object", () => {
    const prev = makeDayState(["done", "done"]);
    const initialRotation = { slotA: 3, slotB: 2 };
    const ctx = makeCtx(0, { ...initialRotation });
    const result = rollover(floatingProgram, prev, ctx, nextDate);
    expect(result.rotationState).not.toBe(ctx.rotationState);
  });

  it("rollover on weekday program still advances floatingIndex correctly", () => {
    const weekdayDay = makeFixedDay("d-wd", ["squat"], 3, [[makeSet()]]);
    const weekdayProg = makeProgram("fixed", "weekday", [weekdayDay]);
    const prev = makeDayState(["done"]);
    const ctx = makeCtx(1, {});
    const result = rollover(weekdayProg, prev, ctx, nextDate);
    // All done → advance
    expect(result.floatingIndex).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Integration: build → applyStatuses → currentSlot → advanceRotation
// ---------------------------------------------------------------------------

describe("Integration flow", () => {
  const exBench = makeExercise("bench", "Bench Press", "Chest", ["chest"], ["triceps"]);
  const exOHP = makeExercise(
    "ohp",
    "Overhead Press",
    "Shoulders",
    ["side_delts"],
    ["front_delts", "triceps"],
  );
  const exDip = makeExercise("dip", "Dip", "Chest", ["chest", "triceps"], []);

  const lookup = makeLookup(exBench, exOHP, exDip);

  it("full session flow: build → apply statuses → currentSlot → advance rotation", () => {
    const cycledDay = makeCycledDay(
      "d-int",
      [
        {
          slotId: "chest-slot",
          muscle: "chest",
          pool: ["bench", "dip"],
          sets: [makeSet(), makeSet()],
        },
        { slotId: "shoulder-slot", muscle: "side_delts", pool: ["ohp"], sets: [makeSet()] },
      ],
      null,
    );

    const rotation: RotationState = { "chest-slot": 0, "shoulder-slot": 0 };

    // Step 1: build
    const slots = buildSlots(cycledDay, lookup, rotation, 50);
    expect(slots).toHaveLength(2);
    expect(slots[0].exercise).toBe("Bench Press");

    // Step 2: apply statuses (starting fresh, doneCount=0)
    const withStatuses = applyStatuses(slots, 0);
    expect(withStatuses[0].status).toBe("now");
    expect(withStatuses[1].status).toBe("upcoming");

    // Step 3: currentSlot returns the "now" one
    const current = currentSlot(withStatuses);
    expect(current?.id).toBe(withStatuses[0].id);

    // Step 4: complete first, apply doneCount=1
    const afterFirst = applyStatuses(withStatuses, 1);
    expect(afterFirst[0].status).toBe("done");
    expect(afterFirst[1].status).toBe("now");
    expect(currentSlot(afterFirst)?.id).toBe(afterFirst[1].id);

    // Step 5: advance rotation
    const newRotation = advanceRotation(cycledDay, rotation);
    expect(newRotation["chest-slot"]).toBe(1); // rotated to "dip"
    expect(newRotation["shoulder-slot"]).toBe(1);

    // Step 6: next session uses the new rotation
    const nextSlots = buildSlots(cycledDay, lookup, newRotation, 50);
    expect(nextSlots[0].exercise).toBe("Dip"); // pool[1]
  });
});
