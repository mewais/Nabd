/**
 * B02 · @nabd/dataset — test suite (modular movement catalog edition)
 *
 * Coverage targets:
 *   - Movement schema / catalog validity
 *   - compose() correctness (equipment expansion, naming, tags, tracking)
 *   - Library interface (all/byId/search/byGroup/musclesOf/withCustom)
 *   - Coverage invariant: every MuscleKey is primary of ≥2 composed exercises
 *   - Accuracy spot-checks for specific movements
 *
 * 100% src coverage required.
 */

import { describe, it, expect } from "vitest";
import type { Exercise, MuscleKey, MuscleGroup } from "@nabd/domain";
import { MUSCLES, MUSCLE_PRIMARY_GROUP, EQUIPMENT_NAMES } from "@nabd/domain";
import { compose, MOVEMENTS, exercises, createLibrary, defaultLibrary } from "@nabd/dataset";
import type { Movement } from "@nabd/dataset";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "ex-1",
    name: "Bench Press",
    group: "Chest",
    primary: ["chest"],
    secondary: ["triceps"],
    equipment: "barbell",
    tracking: "weight_reps",
    timeBased: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Movement catalog — schema validity
// ---------------------------------------------------------------------------

describe("MOVEMENTS catalog — schema validity", () => {
  it("every movement has a non-empty id string", () => {
    for (const m of MOVEMENTS) {
      expect(typeof m.id).toBe("string");
      expect(m.id.length).toBeGreaterThan(0);
    }
  });

  it("every movement has a non-empty name string", () => {
    for (const m of MOVEMENTS) {
      expect(typeof m.name).toBe("string");
      expect(m.name.length).toBeGreaterThan(0);
    }
  });

  it("every movement has at least one primary muscle", () => {
    for (const m of MOVEMENTS) {
      expect(m.primary.length).toBeGreaterThan(0);
    }
  });

  it("every movement primary muscles are valid MuscleKeys", () => {
    const validKeys = new Set<string>(MUSCLES);
    for (const m of MOVEMENTS) {
      for (const muscle of m.primary) {
        expect(validKeys.has(muscle), `Movement '${m.id}' has invalid primary: '${muscle}'`).toBe(
          true,
        );
      }
    }
  });

  it("every movement secondary muscles are valid MuscleKeys", () => {
    const validKeys = new Set<string>(MUSCLES);
    for (const m of MOVEMENTS) {
      for (const muscle of m.secondary) {
        expect(validKeys.has(muscle), `Movement '${m.id}' has invalid secondary: '${muscle}'`).toBe(
          true,
        );
      }
    }
  });

  it("every movement equipment array is non-empty", () => {
    for (const m of MOVEMENTS) {
      expect(m.equipment.length).toBeGreaterThan(0);
    }
  });

  it("every movement laterality array is non-empty", () => {
    for (const m of MOVEMENTS) {
      expect(m.laterality.length).toBeGreaterThan(0);
    }
  });

  it("no duplicate movement ids", () => {
    const ids = MOVEMENTS.map((m) => m.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("no movement has a primary muscle also listed in secondary", () => {
    for (const m of MOVEMENTS) {
      const primarySet = new Set(m.primary);
      for (const sec of m.secondary) {
        expect(
          primarySet.has(sec),
          `Movement '${m.id}' has '${sec}' in both primary and secondary`,
        ).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// compose() — basic expansion
// ---------------------------------------------------------------------------

describe("compose() — equipment expansion", () => {
  it("produces one exercise per equipment when bilateral-only", () => {
    const m: Movement = {
      id: "test_mv",
      name: "Test Move",
      primary: ["chest"],
      secondary: [],
      equipment: ["barbell", "dumbbell"],
      laterality: ["bilateral"],
    };
    const result = compose([m]);
    expect(result.length).toBe(2);
  });

  it("produces bilateral + unilateral when both lateralities listed", () => {
    const m: Movement = {
      id: "test_mv2",
      name: "Test Curl",
      primary: ["biceps"],
      secondary: [],
      equipment: ["dumbbell"],
      laterality: ["bilateral", "unilateral"],
    };
    const result = compose([m]);
    expect(result.length).toBe(2);
    const ids = result.map((e) => e.id);
    expect(ids).toContain("test_mv2__dumbbell");
    expect(ids).toContain("test_mv2__dumbbell__uni");
  });

  it("id is deterministic: {m.id}__{equipment}", () => {
    const m: Movement = {
      id: "bench_test",
      name: "Bench Press Test",
      primary: ["chest"],
      secondary: [],
      equipment: ["barbell"],
      laterality: ["bilateral"],
    };
    const result = compose([m]);
    expect(result[0].id).toBe("bench_test__barbell");
  });

  it("unilateral id gets __uni suffix", () => {
    const m: Movement = {
      id: "lat_raise_test",
      name: "Lateral Raise Test",
      primary: ["side_delts"],
      secondary: [],
      equipment: ["dumbbell"],
      laterality: ["unilateral"],
    };
    const result = compose([m]);
    expect(result[0].id).toBe("lat_raise_test__dumbbell__uni");
  });

  it("all composed exercises have custom: false", () => {
    const result = compose(MOVEMENTS);
    for (const ex of result) {
      expect(ex.custom).toBe(false);
    }
  });

  it("no duplicate ids in full composed dataset", () => {
    const result = compose(MOVEMENTS);
    const ids = result.map((e) => e.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// compose() — naming rules
// ---------------------------------------------------------------------------

describe("compose() — naming rules", () => {
  it("bodyweight equipment uses movement name directly (no 'Bodyweight ' prefix)", () => {
    // plank movement has bodyweight equipment + nameOverride
    const result = compose(MOVEMENTS);
    const plank = result.find((e) => e.id === "plank__bodyweight");
    expect(plank).toBeDefined();
    expect(plank!.name).toBe("Plank");
    expect(plank!.name).not.toMatch(/^Bodyweight /);
  });

  it("non-bodyweight equipment prepends equipment label", () => {
    const result = compose(MOVEMENTS);
    // back_squat__barbell → "Barbell Back Squat"
    const squat = result.find((e) => e.id === "back_squat__barbell");
    expect(squat).toBeDefined();
    expect(squat!.name).toBe("Barbell Back Squat");
  });

  it("nameOverride for equipment replaces default name", () => {
    // fly machine → "Pec Deck" (not "Plate / pin machines Fly")
    const result = compose(MOVEMENTS);
    const pecDeck = result.find((e) => e.id === "fly__machine");
    expect(pecDeck).toBeDefined();
    expect(pecDeck!.name).toBe("Pec Deck");
  });

  it("unilateral upper-body adds 'Single-Arm ' prefix", () => {
    const result = compose(MOVEMENTS);
    // lateral_raise is upper-body (side_delts)
    const uniLat = result.find((e) => e.id === "lateral_raise__dumbbell__uni");
    expect(uniLat).toBeDefined();
    expect(uniLat!.name).toMatch(/^Single-Arm /);
  });

  it("unilateral lower-body adds 'Single-Leg ' prefix", () => {
    const result = compose(MOVEMENTS);
    // glute_bridge is lower-body (glutes) and its bodyweight variant is not deduped
    // (different name from barbell/bands variants)
    const uniGlute = result.find((e) => e.id === "glute_bridge__bodyweight__uni");
    expect(uniGlute).toBeDefined();
    expect(uniGlute!.name).toMatch(/^Single-Leg /);
  });

  it("bodyweight unilateral upper-body without nameOverride adds 'Single-Arm ' prefix to movement name", () => {
    const m: Movement = {
      id: "test_bw_uni_upper",
      name: "Row",
      primary: ["lats"],
      secondary: [],
      equipment: ["bodyweight"],
      laterality: ["unilateral"],
      // No nameOverride
    };
    const [ex] = compose([m]);
    expect(ex.name).toBe("Single-Arm Row");
  });

  it("bodyweight unilateral lower-body without nameOverride adds 'Single-Leg ' prefix to movement name", () => {
    const m: Movement = {
      id: "test_bw_uni_lower",
      name: "Squat",
      primary: ["quads"],
      secondary: [],
      equipment: ["bodyweight"],
      laterality: ["unilateral"],
      // No nameOverride
    };
    const [ex] = compose([m]);
    expect(ex.name).toBe("Single-Leg Squat");
  });

  it("nameOverride 'uni' key takes priority over default unilateral naming", () => {
    // concentration_curl has nameOverride.uni = "Concentration Curl"
    const result = compose(MOVEMENTS);
    const concCurl = result.find((e) => e.id === "concentration_curl__dumbbell__uni");
    expect(concCurl).toBeDefined();
    expect(concCurl!.name).toBe("Concentration Curl");
  });

  it("named row overrides produce expected names", () => {
    const result = compose(MOVEMENTS);
    const barbellRow = result.find((e) => e.id === "row__barbell");
    expect(barbellRow).toBeDefined();
    expect(barbellRow!.name).toBe("Barbell Row");
    const cableRow = result.find((e) => e.id === "row__cable");
    expect(cableRow).toBeDefined();
    expect(cableRow!.name).toBe("Seated Cable Row");
  });

  it("pull_up on pullupbar uses nameOverride 'Pull-Up'", () => {
    const result = compose(MOVEMENTS);
    const pullUp = result.find((e) => e.id === "pull_up__pullupbar");
    expect(pullUp).toBeDefined();
    expect(pullUp!.name).toBe("Pull-Up");
  });
});

// ---------------------------------------------------------------------------
// compose() — group derivation
// ---------------------------------------------------------------------------

describe("compose() — group derivation", () => {
  it("group is MUSCLE_PRIMARY_GROUP[primary[0]] for all exercises", () => {
    const result = compose(MOVEMENTS);
    for (const ex of result) {
      const expected = MUSCLE_PRIMARY_GROUP[ex.primary[0]];
      expect(ex.group).toBe(expected);
    }
  });

  it("bench press has group Chest", () => {
    const result = compose(MOVEMENTS);
    const ex = result.find((e) => e.id === "bench_press__barbell");
    expect(ex!.group).toBe("Chest");
  });

  it("side_bend has group Abs (obliques → Abs)", () => {
    const result = compose(MOVEMENTS);
    const ex = result.find((e) => e.id === "side_bend__dumbbell");
    expect(ex!.group).toBe("Abs");
  });

  it("shrug has group Traps", () => {
    const result = compose(MOVEMENTS);
    const ex = result.find((e) => e.id === "shrug__barbell");
    expect(ex!.group).toBe("Traps");
  });
});

// ---------------------------------------------------------------------------
// compose() — tracking derivation
// ---------------------------------------------------------------------------

describe("compose() — tracking derivation", () => {
  it("bodyweight equipment defaults to weighted_bodyweight", () => {
    const m: Movement = {
      id: "test_bw",
      name: "Test BW",
      primary: ["chest"],
      secondary: [],
      equipment: ["bodyweight"],
      laterality: ["bilateral"],
    };
    const [ex] = compose([m]);
    expect(ex.tracking).toBe("weighted_bodyweight");
  });

  it("pullupbar equipment defaults to weighted_bodyweight", () => {
    const m: Movement = {
      id: "test_pub",
      name: "Test PullupBar",
      primary: ["lats"],
      secondary: [],
      equipment: ["pullupbar"],
      laterality: ["bilateral"],
    };
    const [ex] = compose([m]);
    expect(ex.tracking).toBe("weighted_bodyweight");
  });

  it("barbell equipment defaults to weight_reps", () => {
    const m: Movement = {
      id: "test_bb",
      name: "Test BB",
      primary: ["chest"],
      secondary: [],
      equipment: ["barbell"],
      laterality: ["bilateral"],
    };
    const [ex] = compose([m]);
    expect(ex.tracking).toBe("weight_reps");
  });

  it("movement.tracking override takes priority", () => {
    const m: Movement = {
      id: "test_dur",
      name: "Test Duration",
      primary: ["abs"],
      secondary: [],
      equipment: ["bodyweight"],
      laterality: ["bilateral"],
      tracking: "duration",
    };
    const [ex] = compose([m]);
    expect(ex.tracking).toBe("duration");
  });

  it("timeBased:true without tracking override → tracking='duration'", () => {
    // Covers the branch: m.timeBased === true && m.tracking undefined
    const m: Movement = {
      id: "test_tb_no_tracking",
      name: "Test TimeBased",
      primary: ["abs"],
      secondary: [],
      equipment: ["barbell"],
      laterality: ["bilateral"],
      timeBased: true,
      // tracking intentionally NOT set
    };
    const [ex] = compose([m]);
    expect(ex.tracking).toBe("duration");
    expect(ex.timeBased).toBe(true);
  });

  it("timeBased override takes priority over derived value", () => {
    const m: Movement = {
      id: "test_tb",
      name: "Test TB",
      primary: ["abs"],
      secondary: [],
      equipment: ["bodyweight"],
      laterality: ["bilateral"],
      tracking: "duration",
      timeBased: true,
    };
    const [ex] = compose([m]);
    expect(ex.timeBased).toBe(true);
  });

  it("duration tracking → timeBased = true (when not overridden)", () => {
    const result = compose(MOVEMENTS);
    const plank = result.find((e) => e.id === "plank__bodyweight");
    expect(plank!.tracking).toBe("duration");
    expect(plank!.timeBased).toBe(true);
  });

  it("weight_reps tracking → timeBased = false (when not overridden)", () => {
    const result = compose(MOVEMENTS);
    const bench = result.find((e) => e.id === "bench_press__barbell");
    expect(bench!.tracking).toBe("weight_reps");
    expect(bench!.timeBased).toBe(false);
  });

  it("weight_duration tracking → timeBased = true", () => {
    const result = compose(MOVEMENTS);
    const carry = result.find((e) => e.id === "farmer_carry__dumbbell");
    expect(carry!.tracking).toBe("weight_duration");
    expect(carry!.timeBased).toBe(true);
  });

  it("weighted_bodyweight tracking used for pull-ups (pullupbar equipment)", () => {
    const result = compose(MOVEMENTS);
    const pullUp = result.find((e) => e.id === "pull_up__pullupbar");
    expect(pullUp!.tracking).toBe("weighted_bodyweight");
  });

  it("push_up (bodyweight, non-time) has tracking weighted_bodyweight", () => {
    const result = compose(MOVEMENTS);
    const pushUp = result.find((e) => e.id === "push_up__bodyweight");
    expect(pushUp).toBeDefined();
    expect(pushUp!.tracking).toBe("weighted_bodyweight");
  });

  it("plank (bodyweight, time-based) still has tracking duration", () => {
    const result = compose(MOVEMENTS);
    const plank = result.find((e) => e.id === "plank__bodyweight");
    expect(plank!.tracking).toBe("duration");
  });

  it("barbell bench press still has tracking weight_reps", () => {
    const result = compose(MOVEMENTS);
    const bench = result.find((e) => e.id === "bench_press__barbell");
    expect(bench!.tracking).toBe("weight_reps");
  });

  it("assisted_bodyweight tracking used for assisted pull-up", () => {
    const result = compose(MOVEMENTS);
    const assisted = result.find((e) => e.id === "assisted_pull_up__machine");
    expect(assisted!.tracking).toBe("assisted_bodyweight");
  });
});

// ---------------------------------------------------------------------------
// compose() — dedup pass (bodyweight vs non-bodyweight name collisions)
// ---------------------------------------------------------------------------

describe("compose() — dedup pass", () => {
  it("no duplicate display names where a bodyweight variant coexists with a non-bodyweight one", () => {
    const result = compose(MOVEMENTS);
    const nameGroups = new Map<string, string[]>();
    for (const ex of result) {
      const group = nameGroups.get(ex.name);
      if (group) {
        group.push(ex.equipment);
      } else {
        nameGroups.set(ex.name, [ex.equipment]);
      }
    }
    for (const [name, equipments] of nameGroups) {
      const hasBodyweight = equipments.includes("bodyweight");
      const hasNonBodyweight = equipments.some((e) => e !== "bodyweight");
      expect(
        hasBodyweight && hasNonBodyweight,
        `Display name '${name}' appears with both bodyweight and non-bodyweight equipment`,
      ).toBe(false);
    }
  });

  it("Pull-Up appears exactly once in the composed library", () => {
    const result = compose(MOVEMENTS);
    const pullUps = result.filter((e) => e.name === "Pull-Up");
    expect(pullUps.length).toBe(1);
  });

  it("kept Pull-Up is the pullupbar variant, not bodyweight", () => {
    const result = compose(MOVEMENTS);
    const pullUp = result.find((e) => e.name === "Pull-Up");
    expect(pullUp).toBeDefined();
    expect(pullUp!.id).toBe("pull_up__pullupbar");
    expect(pullUp!.equipment).toBe("pullupbar");
  });

  it("pull_up__bodyweight is absent from the composed library", () => {
    const result = compose(MOVEMENTS);
    const bodyweightPullUp = result.find((e) => e.id === "pull_up__bodyweight");
    expect(bodyweightPullUp).toBeUndefined();
  });

  it("chin_up__bodyweight is absent from the composed library (Chin-Up deduped)", () => {
    const result = compose(MOVEMENTS);
    const bodyweightChinUp = result.find((e) => e.id === "chin_up__bodyweight");
    expect(bodyweightChinUp).toBeUndefined();
    // The pullupbar variant remains
    const chinUp = result.find((e) => e.id === "chin_up__pullupbar");
    expect(chinUp).toBeDefined();
    expect(chinUp!.name).toBe("Chin-Up");
  });

  it("hanging_leg_raise__bodyweight is absent (Hanging Leg Raise deduped; pullupbar kept)", () => {
    const result = compose(MOVEMENTS);
    const bodyweightHLR = result.find((e) => e.id === "hanging_leg_raise__bodyweight");
    expect(bodyweightHLR).toBeUndefined();
    const pullupbarHLR = result.find((e) => e.id === "hanging_leg_raise__pullupbar");
    expect(pullupbarHLR).toBeDefined();
    expect(pullupbarHLR!.name).toBe("Hanging Leg Raise");
  });

  it("movements that are ONLY bodyweight keep their single bodyweight entry (push_up)", () => {
    const result = compose(MOVEMENTS);
    const pushUp = result.find((e) => e.id === "push_up__bodyweight");
    expect(pushUp).toBeDefined();
    expect(pushUp!.name).toBe("Push-Up");
  });

  it("movements that are ONLY bodyweight keep their single bodyweight entry (plank)", () => {
    const result = compose(MOVEMENTS);
    const plank = result.find((e) => e.id === "plank__bodyweight");
    expect(plank).toBeDefined();
    expect(plank!.name).toBe("Plank");
  });

  it("movements that are ONLY bodyweight keep their single bodyweight entry (sit_up)", () => {
    const result = compose(MOVEMENTS);
    const sitUp = result.find((e) => e.id === "sit_up__bodyweight");
    expect(sitUp).toBeDefined();
    expect(sitUp!.name).toBe("Sit-Up");
  });
});

// ---------------------------------------------------------------------------
// compose() — unilateral tag adjustments
// ---------------------------------------------------------------------------

describe("compose() — unilateral tag adjustments", () => {
  it("unilateral variant has IDENTICAL secondary to its bilateral sibling (no auto-injection)", () => {
    const result = compose(MOVEMENTS);
    // lateral_raise: bilateral and unilateral should have the same secondaries
    const bilat = result.find((e) => e.id === "lateral_raise__dumbbell");
    const uni = result.find((e) => e.id === "lateral_raise__dumbbell__uni");
    expect(bilat).toBeDefined();
    expect(uni).toBeDefined();
    expect(uni!.secondary).toEqual(bilat!.secondary);
  });

  it("single-arm unilateral does NOT inject obliques into secondary", () => {
    const result = compose(MOVEMENTS);
    // row is upper body (lats primary) — unilateral should NOT have obliques injected
    const uniRow = result.find((e) => e.id === "row__dumbbell__uni");
    expect(uniRow).toBeDefined();
    expect(uniRow!.secondary).not.toContain("obliques");
  });

  it("single-leg unilateral does NOT inject abductors into secondary", () => {
    const m: Movement = {
      id: "test_lower_uni",
      name: "Test Lower",
      primary: ["quads"],
      secondary: [],
      equipment: ["dumbbell"],
      laterality: ["unilateral"],
    };
    const [ex] = compose([m]);
    expect(ex.secondary).not.toContain("abductors");
    expect(ex.secondary).not.toContain("adductors");
  });

  it("single-leg unilateral does NOT inject glutes into secondary", () => {
    const m: Movement = {
      id: "test_lower_uni_glutes",
      name: "Test Lower Glutes",
      primary: ["quads"],
      secondary: [],
      equipment: ["dumbbell"],
      laterality: ["unilateral"],
    };
    const [ex] = compose([m]);
    expect(ex.secondary).not.toContain("glutes");
  });

  it("unilateral upper-body row has same secondaries as bilateral (biceps, rear_delts, lower_traps)", () => {
    const result = compose(MOVEMENTS);
    const bilat = result.find((e) => e.id === "row__dumbbell");
    const uni = result.find((e) => e.id === "row__dumbbell__uni");
    expect(bilat).toBeDefined();
    expect(uni).toBeDefined();
    expect(uni!.secondary).toEqual(bilat!.secondary);
  });

  it("bilateral exercises have same secondary as movement definition", () => {
    const result = compose(MOVEMENTS);
    const benchBilateral = result.find((e) => e.id === "bench_press__barbell");
    expect(benchBilateral!.secondary).toEqual(expect.arrayContaining(["front_delts", "triceps"]));
  });

  it("secondary tags are deduplicated", () => {
    const m: Movement = {
      id: "test_dedup",
      name: "Test Dedup",
      primary: ["lats"],
      secondary: ["biceps", "biceps"],
      equipment: ["dumbbell"],
      laterality: ["unilateral"],
    };
    const [ex] = compose([m]);
    const bicepsCount = ex.secondary.filter((s) => s === "biceps").length;
    expect(bicepsCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Accuracy spot-checks (the bugs we're fixing)
// ---------------------------------------------------------------------------

describe("Accuracy spot-checks", () => {
  const all = compose(MOVEMENTS);

  // Side Bend
  it("Side Bend primary is obliques (NOT abs)", () => {
    const ex = all.find((e) => e.id === "side_bend__dumbbell");
    expect(ex).toBeDefined();
    expect(ex!.primary).toContain("obliques");
    expect(ex!.primary).not.toContain("abs");
  });

  it("Side Bend secondary contains lower_back", () => {
    const ex = all.find((e) => e.id === "side_bend__dumbbell");
    expect(ex!.secondary).toContain("lower_back");
  });

  // Russian Twist
  it("Russian Twist primary is obliques", () => {
    const ex = all.find((e) => e.id === "russian_twist__bodyweight");
    expect(ex).toBeDefined();
    expect(ex!.primary).toContain("obliques");
    expect(ex!.primary).not.toContain("abs");
  });

  it("Russian Twist secondary contains abs", () => {
    const ex = all.find((e) => e.id === "russian_twist__bodyweight");
    expect(ex!.secondary).toContain("abs");
  });

  // Cable Woodchopper
  it("Cable Woodchopper primary is obliques", () => {
    const ex = all.find((e) => e.id === "cable_woodchopper__cable");
    expect(ex).toBeDefined();
    expect(ex!.primary).toContain("obliques");
  });

  // Crunch / Sit-Up
  it("Crunch primary is abs", () => {
    const ex = all.find((e) => e.id === "crunch__bodyweight");
    expect(ex).toBeDefined();
    expect(ex!.primary).toContain("abs");
    expect(ex!.primary).not.toContain("obliques");
  });

  it("Sit-Up primary is abs", () => {
    const ex = all.find((e) => e.id === "sit_up__bodyweight");
    expect(ex).toBeDefined();
    expect(ex!.primary).toContain("abs");
  });

  // Lateral Raise
  it("Lateral Raise primary is side_delts", () => {
    const ex = all.find((e) => e.id === "lateral_raise__dumbbell");
    expect(ex).toBeDefined();
    expect(ex!.primary).toEqual(["side_delts"]);
  });

  it("Lateral Raise bilateral secondary does NOT contain obliques", () => {
    const ex = all.find((e) => e.id === "lateral_raise__dumbbell");
    expect(ex!.secondary).not.toContain("obliques");
  });

  it("Single-Arm Lateral Raise secondary does NOT contain obliques", () => {
    const ex = all.find((e) => e.id === "lateral_raise__dumbbell__uni");
    expect(ex).toBeDefined();
    expect(ex!.secondary).not.toContain("obliques");
  });

  it("Single-Arm Lateral Raise secondary equals bilateral Lateral Raise secondary", () => {
    const bilat = all.find((e) => e.id === "lateral_raise__dumbbell");
    const uni = all.find((e) => e.id === "lateral_raise__dumbbell__uni");
    expect(uni!.secondary).toEqual(bilat!.secondary);
  });

  // Front Raise
  it("Front Raise primary is front_delts", () => {
    const ex = all.find((e) => e.id === "front_raise__dumbbell");
    expect(ex).toBeDefined();
    expect(ex!.primary).toContain("front_delts");
  });

  // Rear Delt Fly / Face Pull
  it("Rear Delt Fly primary is rear_delts", () => {
    const ex = all.find((e) => e.id === "rear_delt_fly__dumbbell");
    expect(ex).toBeDefined();
    expect(ex!.primary).toContain("rear_delts");
  });

  it("Face Pull primary includes rear_delts and rhomboids", () => {
    const ex = all.find((e) => e.id === "face_pull__cable");
    expect(ex).toBeDefined();
    expect(ex!.primary).toContain("rear_delts");
    expect(ex!.primary).toContain("rhomboids");
  });

  // Romanian Deadlift
  it("Romanian Deadlift primary is hamstrings", () => {
    const ex = all.find((e) => e.id === "romanian_deadlift__barbell");
    expect(ex).toBeDefined();
    expect(ex!.primary[0]).toBe("hamstrings");
    expect(ex!.primary).not.toContain("lower_back");
  });

  it("Romanian Deadlift secondary includes glutes and lower_back", () => {
    const ex = all.find((e) => e.id === "romanian_deadlift__barbell");
    expect(ex!.secondary).toContain("glutes");
    expect(ex!.secondary).toContain("lower_back");
  });

  // Conventional Deadlift
  it("Conventional Deadlift primary includes lower_back, glutes, hamstrings", () => {
    const ex = all.find((e) => e.id === "deadlift__barbell");
    expect(ex).toBeDefined();
    expect(ex!.primary).toContain("lower_back");
    expect(ex!.primary).toContain("glutes");
    expect(ex!.primary).toContain("hamstrings");
  });

  it("Conventional Deadlift secondary includes lats, quads, forearms", () => {
    const ex = all.find((e) => e.id === "deadlift__barbell");
    expect(ex!.secondary).toContain("lats");
    expect(ex!.secondary).toContain("quads");
    expect(ex!.secondary).toContain("forearms");
  });

  // Hip Thrust
  it("Hip Thrust primary is glutes", () => {
    const ex = all.find((e) => e.id === "hip_thrust__barbell");
    expect(ex).toBeDefined();
    expect(ex!.primary[0]).toBe("glutes");
  });

  it("Hip Thrust secondary includes hamstrings", () => {
    const ex = all.find((e) => e.id === "hip_thrust__barbell");
    expect(ex!.secondary).toContain("hamstrings");
  });

  // Leg Extension
  it("Leg Extension primary is quads only", () => {
    const ex = all.find((e) => e.id === "leg_extension__machine");
    expect(ex).toBeDefined();
    expect(ex!.primary).toEqual(["quads"]);
  });

  // Leg Curl
  it("Leg Curl primary is hamstrings only", () => {
    const ex = all.find((e) => e.id === "leg_curl__machine");
    expect(ex).toBeDefined();
    expect(ex!.primary).toEqual(["hamstrings"]);
  });

  // Calf Raise
  it("Calf Raise primary is calves", () => {
    const ex = all.find((e) => e.id === "calf_raise__machine");
    expect(ex).toBeDefined();
    expect(ex!.primary).toEqual(["calves"]);
  });

  // Tibialis Raise
  it("Tibialis Raise primary is tibialis", () => {
    const ex = all.find((e) => e.id === "tibialis_raise__bodyweight");
    expect(ex).toBeDefined();
    expect(ex!.primary).toEqual(["tibialis"]);
  });

  // Hip Abduction
  it("Hip Abduction primary is abductors", () => {
    const ex = all.find((e) => e.id === "hip_abduction__machine");
    expect(ex).toBeDefined();
    expect(ex!.primary).toContain("abductors");
  });

  // Hip Adduction
  it("Hip Adduction primary is adductors", () => {
    const ex = all.find((e) => e.id === "hip_adduction__machine");
    expect(ex).toBeDefined();
    expect(ex!.primary).toContain("adductors");
  });

  // Hanging Leg Raise
  it("Hanging Leg Raise primary includes hip_flexors and abs", () => {
    const ex = all.find((e) => e.id === "hanging_leg_raise__pullupbar");
    expect(ex).toBeDefined();
    expect(ex!.primary).toContain("hip_flexors");
    expect(ex!.primary).toContain("abs");
  });

  // Shrug
  it("Shrug primary is upper_traps", () => {
    const ex = all.find((e) => e.id === "shrug__barbell");
    expect(ex).toBeDefined();
    expect(ex!.primary).toEqual(["upper_traps"]);
  });

  // Upright Row
  it("Upright Row primary includes side_delts and upper_traps", () => {
    const ex = all.find((e) => e.id === "upright_row__barbell");
    expect(ex).toBeDefined();
    expect(ex!.primary).toContain("side_delts");
    expect(ex!.primary).toContain("upper_traps");
  });

  // Pull-Up / Lat Pulldown
  it("Pull-Up primary is lats", () => {
    const ex = all.find((e) => e.id === "pull_up__pullupbar");
    expect(ex).toBeDefined();
    expect(ex!.primary).toContain("lats");
    expect(ex!.secondary).toContain("biceps");
    expect(ex!.secondary).toContain("rhomboids");
  });

  it("Lat Pulldown primary is lats", () => {
    const ex = all.find((e) => e.id === "lat_pulldown__cable");
    expect(ex).toBeDefined();
    expect(ex!.primary).toContain("lats");
    expect(ex!.secondary).toContain("biceps");
    expect(ex!.secondary).toContain("rhomboids");
  });

  // Row family — refined muscle tags
  it("Barbell Row primary includes lats and rhomboids", () => {
    const ex = all.find((e) => e.id === "row__barbell");
    expect(ex).toBeDefined();
    expect(ex!.primary).toContain("lats");
    expect(ex!.primary).toContain("rhomboids");
  });

  it("Barbell Row secondary includes biceps, rear_delts, and lower_traps", () => {
    const ex = all.find((e) => e.id === "row__barbell");
    expect(ex!.secondary).toContain("biceps");
    expect(ex!.secondary).toContain("rear_delts");
    expect(ex!.secondary).toContain("lower_traps");
  });

  it("Pendlay Row secondary includes biceps, rear_delts, and lower_traps", () => {
    const ex = all.find((e) => e.id === "pendlay_row__barbell");
    expect(ex).toBeDefined();
    expect(ex!.secondary).toContain("biceps");
    expect(ex!.secondary).toContain("rear_delts");
    expect(ex!.secondary).toContain("lower_traps");
  });

  it("T-Bar Row secondary includes biceps, rear_delts, and lower_traps (not upper_traps)", () => {
    const ex = all.find((e) => e.id === "t_bar_row__barbell");
    expect(ex).toBeDefined();
    expect(ex!.secondary).toContain("biceps");
    expect(ex!.secondary).toContain("rear_delts");
    expect(ex!.secondary).toContain("lower_traps");
    expect(ex!.secondary).not.toContain("upper_traps");
  });

  it("Inverted Row primary is rhomboids only; lats demoted to secondary (assist, not prime mover)", () => {
    const ex = all.find((e) => e.id === "inverted_row__bodyweight");
    expect(ex).toBeDefined();
    expect(ex!.primary).toEqual(["rhomboids"]);
    expect(ex!.primary).not.toContain("lats");
    expect(ex!.secondary).toContain("lats");
  });

  it("Inverted Row group is Back (rhomboids → Back)", () => {
    const ex = all.find((e) => e.id === "inverted_row__bodyweight");
    expect(ex!.group).toBe("Back");
  });

  it("Inverted Row secondary includes rear_delts and lower_traps", () => {
    const ex = all.find((e) => e.id === "inverted_row__bodyweight");
    expect(ex!.secondary).toContain("biceps");
    expect(ex!.secondary).toContain("rear_delts");
    expect(ex!.secondary).toContain("lower_traps");
  });

  it("Chest-Supported Row primary is rhomboids only; lats demoted to secondary", () => {
    const ex = all.find((e) => e.id === "chest_supported_row__dumbbell");
    expect(ex).toBeDefined();
    expect(ex!.primary).toEqual(["rhomboids"]);
    expect(ex!.primary).not.toContain("lats");
    expect(ex!.secondary).toContain("lats");
  });

  it("Chest-Supported Row secondary includes biceps, rear_delts, and lower_traps", () => {
    const ex = all.find((e) => e.id === "chest_supported_row__dumbbell");
    expect(ex!.secondary).toContain("biceps");
    expect(ex!.secondary).toContain("rear_delts");
    expect(ex!.secondary).toContain("lower_traps");
  });

  // Close-Grip Bench Press
  it("Close-Grip Bench Press primary is triceps", () => {
    const ex = all.find((e) => e.id === "close_grip_bench_press__barbell");
    expect(ex).toBeDefined();
    expect(ex!.primary).toContain("triceps");
  });

  // Triceps Pushdown
  it("Triceps Pushdown primary is triceps", () => {
    const ex = all.find((e) => e.id === "triceps_pushdown__cable");
    expect(ex).toBeDefined();
    expect(ex!.primary).toEqual(["triceps"]);
  });

  // Skullcrusher
  it("Skullcrusher primary is triceps", () => {
    const ex = all.find((e) => e.id === "skullcrusher__ezbar");
    expect(ex).toBeDefined();
    expect(ex!.primary).toEqual(["triceps"]);
  });

  // Curl
  it("Barbell Curl primary is biceps", () => {
    const ex = all.find((e) => e.id === "curl__barbell");
    expect(ex).toBeDefined();
    expect(ex!.primary).toEqual(["biceps"]);
  });

  // Hammer Curl
  it("Hammer Curl primary is biceps, secondary includes forearms", () => {
    const ex = all.find((e) => e.id === "hammer_curl__dumbbell");
    expect(ex).toBeDefined();
    expect(ex!.primary).toContain("biceps");
    expect(ex!.secondary).toContain("forearms");
  });

  // Wrist Curl
  it("Wrist Curl primary is forearms", () => {
    const ex = all.find((e) => e.id === "wrist_curl__dumbbell");
    expect(ex).toBeDefined();
    expect(ex!.primary).toEqual(["forearms"]);
  });

  // Overhead Press
  it("Overhead Press primary is front_delts", () => {
    const ex = all.find((e) => e.id === "overhead_press__barbell");
    expect(ex).toBeDefined();
    expect(ex!.primary).toContain("front_delts");
  });
});

// ---------------------------------------------------------------------------
// Coverage invariant: every MuscleKey is primary of ≥2 composed exercises
// ---------------------------------------------------------------------------

describe("Coverage invariant", () => {
  it("every MuscleKey is the primary muscle of at least 2 composed exercises", () => {
    const result = compose(MOVEMENTS);
    for (const muscle of MUSCLES) {
      const count = result.filter((e) => e.primary.includes(muscle as MuscleKey)).length;
      expect(
        count,
        `Muscle '${muscle}' is primary of only ${count} exercise(s) — need ≥2`,
      ).toBeGreaterThanOrEqual(2);
    }
  });
});

// ---------------------------------------------------------------------------
// exercises()
// ---------------------------------------------------------------------------

describe("exercises()", () => {
  it("returns an array of exercises", () => {
    const exs = exercises();
    expect(Array.isArray(exs)).toBe(true);
  });

  it("returns a non-empty array", () => {
    const exs = exercises();
    expect(exs.length).toBeGreaterThan(0);
  });

  it("all exercises have valid structure", () => {
    const exs = exercises();
    for (const ex of exs) {
      expect(typeof ex.id).toBe("string");
      expect(typeof ex.name).toBe("string");
      expect(ex.primary.length).toBeGreaterThan(0);
      expect(typeof ex.equipment).toBe("string");
      expect(typeof ex.tracking).toBe("string");
    }
  });

  it("no duplicate ids", () => {
    const exs = exercises();
    const ids = exs.map((e) => e.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("all primary muscles are valid MuscleKeys", () => {
    const validKeys = new Set<string>(MUSCLES);
    const exs = exercises();
    for (const ex of exs) {
      for (const m of ex.primary) {
        expect(validKeys.has(m)).toBe(true);
      }
    }
  });

  it("all secondary muscles are valid MuscleKeys", () => {
    const validKeys = new Set<string>(MUSCLES);
    const exs = exercises();
    for (const ex of exs) {
      for (const m of ex.secondary) {
        expect(validKeys.has(m)).toBe(true);
      }
    }
  });

  it("returns 90+ exercises (comprehensive catalog)", () => {
    const exs = exercises();
    expect(exs.length).toBeGreaterThanOrEqual(90);
  });
});

// ---------------------------------------------------------------------------
// createLibrary and Library accessors
// ---------------------------------------------------------------------------

describe("createLibrary", () => {
  const ex1 = makeExercise({
    id: "lib-1",
    name: "Bench Press",
    group: "Chest",
    primary: ["chest"],
    secondary: ["triceps"],
    equipment: "barbell",
  });
  const ex2 = makeExercise({
    id: "lib-2",
    name: "Squat",
    group: "Quads",
    primary: ["quads"],
    secondary: ["glutes", "hamstrings"],
    equipment: "barbell",
  });
  const ex3 = makeExercise({
    id: "lib-3",
    name: "Pull-Up",
    group: "Back",
    primary: ["lats"],
    secondary: ["biceps"],
    equipment: "bodyweight",
    tracking: "weighted_bodyweight",
  });
  const ex4 = makeExercise({
    id: "lib-4",
    name: "Curl",
    group: "Biceps",
    primary: ["biceps"],
    secondary: [],
    equipment: "dumbbell",
  });
  const customEx = makeExercise({
    id: "cust-1",
    name: "Custom Move",
    group: "Chest",
    primary: ["chest"],
    secondary: [],
    equipment: "bodyweight",
    custom: true,
  });

  describe("all()", () => {
    it("returns the full input array", () => {
      const lib = createLibrary([ex1, ex2, ex3, ex4]);
      expect(lib.all()).toEqual([ex1, ex2, ex3, ex4]);
    });

    it("returns empty array for empty library", () => {
      const lib = createLibrary([]);
      expect(lib.all()).toEqual([]);
    });
  });

  describe("byId()", () => {
    it("returns exercise on hit", () => {
      const lib = createLibrary([ex1, ex2, ex3, ex4]);
      expect(lib.byId("lib-1")).toEqual(ex1);
    });

    it("returns undefined on miss", () => {
      const lib = createLibrary([ex1, ex2, ex3, ex4]);
      expect(lib.byId("does-not-exist")).toBeUndefined();
    });
  });

  describe("search()", () => {
    it("matches case-insensitive substring", () => {
      const lib = createLibrary([ex1, ex2, ex3, ex4]);
      const results = lib.search("bench");
      expect(results).toEqual([ex1]);
    });

    it("matches uppercase query against lowercase name", () => {
      const lib = createLibrary([ex1, ex2, ex3, ex4]);
      const results = lib.search("SQUAT");
      expect(results).toEqual([ex2]);
    });

    it("matches partial substring", () => {
      const lib = createLibrary([ex1, ex2, ex3, ex4]);
      const results = lib.search("url");
      expect(results).toEqual([ex4]);
    });

    it("returns empty array when no match", () => {
      const lib = createLibrary([ex1, ex2, ex3, ex4]);
      const results = lib.search("xyzzy_nomatch");
      expect(results).toEqual([]);
    });

    it("returns multiple matches for broad query", () => {
      const lib = createLibrary([ex1, ex2, ex3, ex4]);
      const results = lib.search("u");
      // Squat, Pull-Up, Curl all contain 'u'
      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("byGroup()", () => {
    it("returns exercises in the specified group", () => {
      const lib = createLibrary([ex1, ex2, ex3, ex4]);
      const results = lib.byGroup("Chest");
      expect(results).toEqual([ex1]);
    });

    it("returns empty array when no exercises in group", () => {
      const lib = createLibrary([ex1, ex2, ex3, ex4]);
      const results = lib.byGroup("Hamstrings");
      expect(results).toEqual([]);
    });

    it("returns all exercises in a group with multiple entries", () => {
      const extraChest = makeExercise({
        id: "extra-chest",
        name: "Cable Fly",
        group: "Chest",
        primary: ["chest"],
        secondary: [],
        equipment: "cable",
      });
      const lib2 = createLibrary([ex1, extraChest]);
      const results = lib2.byGroup("Chest");
      expect(results.length).toBe(2);
    });
  });

  describe("musclesOf()", () => {
    it("returns union of primary and secondary muscles", () => {
      const lib = createLibrary([ex1]);
      const muscles = lib.musclesOf(ex1);
      expect(muscles).toContain("chest");
      expect(muscles).toContain("triceps");
    });

    it("deduplicates muscles", () => {
      const lib = createLibrary([ex1]);
      const dupEx = makeExercise({
        id: "dup-ex",
        name: "Overlap",
        group: "Chest",
        primary: ["chest"],
        secondary: ["chest"],
      });
      const muscles = lib.musclesOf(dupEx);
      const uniqueMuscles = [...new Set(muscles)];
      expect(muscles).toEqual(uniqueMuscles);
    });

    it("includes all primary and secondary muscles", () => {
      const lib = createLibrary([ex2]);
      const muscles = lib.musclesOf(ex2);
      expect(muscles).toContain("quads");
      expect(muscles).toContain("glutes");
      expect(muscles).toContain("hamstrings");
    });

    it("returns only primary when secondary is empty", () => {
      const exNoSec = makeExercise({
        id: "no-sec",
        name: "Leg Extension",
        group: "Quads",
        primary: ["quads"],
        secondary: [],
        equipment: "machine",
      });
      const lib = createLibrary([exNoSec]);
      expect(lib.musclesOf(exNoSec)).toEqual(["quads"]);
    });
  });

  describe("withCustom()", () => {
    it("returns a new Library that includes custom exercises", () => {
      const lib = createLibrary([ex1, ex2, ex3, ex4]);
      const extended = lib.withCustom([customEx]);
      const all = extended.all();
      expect(all.map((e) => e.id)).toContain("cust-1");
    });

    it("includes both base and custom exercises", () => {
      const lib = createLibrary([ex1, ex2, ex3, ex4]);
      const extended = lib.withCustom([customEx]);
      const all = extended.all();
      expect(all.map((e) => e.id)).toContain("lib-1");
      expect(all.map((e) => e.id)).toContain("cust-1");
    });

    it("new library has correct total count", () => {
      const lib = createLibrary([ex1, ex2, ex3, ex4]);
      const extended = lib.withCustom([customEx]);
      expect(extended.all().length).toBe(5);
    });

    it("withCustom([]) returns same exercises", () => {
      const lib = createLibrary([ex1, ex2]);
      const extended = lib.withCustom([]);
      expect(extended.all().length).toBe(2);
    });
  });
});

// ---------------------------------------------------------------------------
// defaultLibrary()
// ---------------------------------------------------------------------------

describe("defaultLibrary()", () => {
  it("returns a library backed by exercises()", () => {
    const lib = defaultLibrary();
    const all = lib.all();
    expect(all.length).toBe(exercises().length);
  });

  it("byId works on the default library", () => {
    const lib = defaultLibrary();
    const all = lib.all();
    const first = all[0];
    expect(lib.byId(first.id)).toEqual(first);
  });

  it("search works on the default library", () => {
    const lib = defaultLibrary();
    const results = lib.search("bench press");
    expect(results.length).toBeGreaterThan(0);
  });

  it("byGroup works on the default library", () => {
    const lib = defaultLibrary();
    const chestExercises = lib.byGroup("Chest");
    expect(chestExercises.length).toBeGreaterThan(0);
    for (const ex of chestExercises) {
      expect(ex.group).toBe("Chest");
    }
  });
});

// ---------------------------------------------------------------------------
// Report: specific movement ids and names for demo re-pointing
// ---------------------------------------------------------------------------

describe("Demo movement ids/names verification", () => {
  const all = compose(MOVEMENTS);

  it("bench press barbell: id=bench_press__barbell", () => {
    const ex = all.find((e) => e.id === "bench_press__barbell");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Barbell Bench Press");
  });

  it("incline bench press barbell: id=incline_bench_press__barbell", () => {
    const ex = all.find((e) => e.id === "incline_bench_press__barbell");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Barbell Incline Bench Press");
  });

  it("incline bench press dumbbell: id=incline_bench_press__dumbbell", () => {
    const ex = all.find((e) => e.id === "incline_bench_press__dumbbell");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Dumbbell Incline Bench Press");
  });

  it("dumbbell fly: id=fly__dumbbell", () => {
    const ex = all.find((e) => e.id === "fly__dumbbell");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Dumbbell Fly");
  });

  it("lateral raise dumbbell: id=lateral_raise__dumbbell", () => {
    const ex = all.find((e) => e.id === "lateral_raise__dumbbell");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Dumbbell Lateral Raise");
  });

  it("overhead press barbell: id=overhead_press__barbell", () => {
    const ex = all.find((e) => e.id === "overhead_press__barbell");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Barbell Overhead Press");
  });

  it("pull_up__bodyweight is absent (deduped); pull_up__pullupbar is the canonical Pull-Up", () => {
    // pull_up__bodyweight is dropped by the dedup pass because pull_up__pullupbar
    // produces the same display name "Pull-Up" and is the more specific equipment.
    const bodyweightPullUp = all.find((e) => e.id === "pull_up__bodyweight");
    expect(bodyweightPullUp).toBeUndefined();
    const pullupbarPullUp = all.find((e) => e.id === "pull_up__pullupbar");
    expect(pullupbarPullUp).toBeDefined();
    expect(pullupbarPullUp!.name).toBe("Pull-Up");
  });

  it("barbell row: id=row__barbell", () => {
    const ex = all.find((e) => e.id === "row__barbell");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Barbell Row");
  });

  it("lat pulldown cable: id=lat_pulldown__cable", () => {
    const ex = all.find((e) => e.id === "lat_pulldown__cable");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Cable Lat Pulldown");
  });

  it("barbell curl: id=curl__barbell", () => {
    const ex = all.find((e) => e.id === "curl__barbell");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Barbell Curl");
  });

  it("hammer curl dumbbell: id=hammer_curl__dumbbell", () => {
    const ex = all.find((e) => e.id === "hammer_curl__dumbbell");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Dumbbell Hammer Curl");
  });

  it("triceps pushdown cable: id=triceps_pushdown__cable", () => {
    const ex = all.find((e) => e.id === "triceps_pushdown__cable");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Cable Triceps Pushdown");
  });

  it("back squat barbell: id=back_squat__barbell", () => {
    const ex = all.find((e) => e.id === "back_squat__barbell");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Barbell Back Squat");
  });

  it("romanian deadlift barbell: id=romanian_deadlift__barbell", () => {
    const ex = all.find((e) => e.id === "romanian_deadlift__barbell");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Barbell Romanian Deadlift");
  });

  it("leg press machine: id=leg_press__machine", () => {
    const ex = all.find((e) => e.id === "leg_press__machine");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Leg Press");
  });

  it("walking lunge dumbbell: id=walking_lunge__dumbbell", () => {
    const ex = all.find((e) => e.id === "walking_lunge__dumbbell");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Dumbbell Walking Lunge");
  });

  it("leg curl machine: id=leg_curl__machine", () => {
    const ex = all.find((e) => e.id === "leg_curl__machine");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Leg Curl");
  });

  it("calf raise machine: id=calf_raise__machine", () => {
    const ex = all.find((e) => e.id === "calf_raise__machine");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Calf Raise");
  });

  it("plank bodyweight: id=plank__bodyweight", () => {
    const ex = all.find((e) => e.id === "plank__bodyweight");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Plank");
  });

  it("hanging leg raise: id=hanging_leg_raise__pullupbar", () => {
    const ex = all.find((e) => e.id === "hanging_leg_raise__pullupbar");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Hanging Leg Raise");
  });

  it("side bend dumbbell: id=side_bend__dumbbell", () => {
    const ex = all.find((e) => e.id === "side_bend__dumbbell");
    expect(ex).toBeDefined();
    expect(ex!.name).toBe("Dumbbell Side Bend");
  });
});
