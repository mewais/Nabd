/**
 * B02 · @nabd/dataset — test suite
 *
 * All tests are written against the FROZEN skeleton (every body throws
 * "not implemented"). Running against the skeleton must produce:
 *   - Every test RED (Error: not implemented)
 *   - 100% line/function/statement coverage of src/index.ts
 *
 * Do NOT use vi.mock or any module-query hacks. Import normally.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ExerciseSchema } from "@nabd/domain";
import type { Exercise, Equipment, MuscleKey, MuscleGroup } from "@nabd/domain";
import {
  normalizeEquipment,
  normalizeMuscle,
  normalizeGroup,
  refineMuscles,
  inferTracking,
  normalizeRecord,
  mergeAndDedupe,
  buildDataset,
  seed,
  exercises,
  createLibrary,
  defaultLibrary,
} from "@nabd/dataset";
import type { RawExercise } from "@nabd/dataset";

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

function rawRec(overrides: Partial<RawExercise> = {}): RawExercise {
  return {
    id: "test_id",
    name: "Test Exercise",
    force: "push",
    level: "beginner",
    mechanic: "compound",
    equipment: "barbell",
    primaryMuscles: ["chest"],
    secondaryMuscles: ["shoulders", "triceps"],
    instructions: [],
    category: "strength",
    images: [],
    ...overrides,
  };
}

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
// normalizeEquipment
// ---------------------------------------------------------------------------

describe("normalizeEquipment", () => {
  it("maps 'body only' → bodyweight", () => {
    expect(normalizeEquipment("body only")).toBe("bodyweight");
  });

  it("maps 'dumbbell' → dumbbell", () => {
    expect(normalizeEquipment("dumbbell")).toBe("dumbbell");
  });

  it("maps 'barbell' → barbell", () => {
    expect(normalizeEquipment("barbell")).toBe("barbell");
  });

  it("maps 'e-z curl bar' → ezbar", () => {
    expect(normalizeEquipment("e-z curl bar")).toBe("ezbar");
  });

  it("maps 'kettlebells' → kettlebell", () => {
    expect(normalizeEquipment("kettlebells")).toBe("kettlebell");
  });

  it("maps 'bands' → bands", () => {
    expect(normalizeEquipment("bands")).toBe("bands");
  });

  it("maps 'cable' → cable", () => {
    expect(normalizeEquipment("cable")).toBe("cable");
  });

  it("maps 'machine' → machine", () => {
    expect(normalizeEquipment("machine")).toBe("machine");
  });

  it("maps 'exercise ball' → bodyweight", () => {
    expect(normalizeEquipment("exercise ball")).toBe("bodyweight");
  });

  it("maps 'medicine ball' → bodyweight", () => {
    expect(normalizeEquipment("medicine ball")).toBe("bodyweight");
  });

  it("maps 'foam roll' → null (dropped)", () => {
    expect(normalizeEquipment("foam roll")).toBe(null);
  });

  it("maps 'other' → null (dropped)", () => {
    expect(normalizeEquipment("other")).toBe(null);
  });

  it("maps null → null (dropped)", () => {
    expect(normalizeEquipment(null)).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// normalizeMuscle
// ---------------------------------------------------------------------------

describe("normalizeMuscle", () => {
  it("maps 'abdominals' → [abs]", () => {
    expect(normalizeMuscle("abdominals")).toEqual(["abs"]);
  });

  it("maps 'lower back' → [lower_back]", () => {
    expect(normalizeMuscle("lower back")).toEqual(["lower_back"]);
  });

  it("maps 'middle back' → [rhomboids]", () => {
    expect(normalizeMuscle("middle back")).toEqual(["rhomboids"]);
  });

  it("maps 'traps' → [upper_traps]", () => {
    expect(normalizeMuscle("traps")).toEqual(["upper_traps"]);
  });

  it("maps 'shoulders' → [side_delts]", () => {
    expect(normalizeMuscle("shoulders")).toEqual(["side_delts"]);
  });

  it("maps 'quadriceps' → [quads]", () => {
    expect(normalizeMuscle("quadriceps")).toEqual(["quads"]);
  });

  it("maps 'chest' → [chest] (identity)", () => {
    expect(normalizeMuscle("chest")).toEqual(["chest"]);
  });

  it("maps 'lats' → [lats] (identity)", () => {
    expect(normalizeMuscle("lats")).toEqual(["lats"]);
  });

  it("maps 'biceps' → [biceps] (identity)", () => {
    expect(normalizeMuscle("biceps")).toEqual(["biceps"]);
  });

  it("maps 'triceps' → [triceps] (identity)", () => {
    expect(normalizeMuscle("triceps")).toEqual(["triceps"]);
  });

  it("maps 'forearms' → [forearms] (identity)", () => {
    expect(normalizeMuscle("forearms")).toEqual(["forearms"]);
  });

  it("maps 'calves' → [calves] (identity)", () => {
    expect(normalizeMuscle("calves")).toEqual(["calves"]);
  });

  it("maps 'glutes' → [glutes] (identity)", () => {
    expect(normalizeMuscle("glutes")).toEqual(["glutes"]);
  });

  it("maps 'hamstrings' → [hamstrings] (identity)", () => {
    expect(normalizeMuscle("hamstrings")).toEqual(["hamstrings"]);
  });

  it("maps 'abductors' → [abductors] (identity)", () => {
    expect(normalizeMuscle("abductors")).toEqual(["abductors"]);
  });

  it("maps 'adductors' → [adductors] (identity)", () => {
    expect(normalizeMuscle("adductors")).toEqual(["adductors"]);
  });

  it("maps 'neck' → [neck] (identity)", () => {
    expect(normalizeMuscle("neck")).toEqual(["neck"]);
  });

  it("maps unknown muscle → []", () => {
    expect(normalizeMuscle("unknown_xyzzy")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// normalizeGroup
// ---------------------------------------------------------------------------

describe("normalizeGroup", () => {
  it("maps 'abdominals' → Abs", () => {
    expect(normalizeGroup("abdominals")).toBe("Abs");
  });

  it("maps 'chest' → Chest", () => {
    expect(normalizeGroup("chest")).toBe("Chest");
  });

  it("maps 'lats' → Back", () => {
    expect(normalizeGroup("lats")).toBe("Back");
  });

  it("maps 'middle back' → Back", () => {
    expect(normalizeGroup("middle back")).toBe("Back");
  });

  it("maps 'lower back' → Back", () => {
    expect(normalizeGroup("lower back")).toBe("Back");
  });

  it("maps 'traps' → Traps", () => {
    expect(normalizeGroup("traps")).toBe("Traps");
  });

  it("maps 'shoulders' → Shoulders", () => {
    expect(normalizeGroup("shoulders")).toBe("Shoulders");
  });

  it("maps 'triceps' → Triceps", () => {
    expect(normalizeGroup("triceps")).toBe("Triceps");
  });

  it("maps 'biceps' → Biceps", () => {
    expect(normalizeGroup("biceps")).toBe("Biceps");
  });

  it("maps 'forearms' → Forearms", () => {
    expect(normalizeGroup("forearms")).toBe("Forearms");
  });

  it("maps 'quadriceps' → Quads", () => {
    expect(normalizeGroup("quadriceps")).toBe("Quads");
  });

  it("maps 'hamstrings' → Hamstrings", () => {
    expect(normalizeGroup("hamstrings")).toBe("Hamstrings");
  });

  it("maps 'glutes' → Glutes", () => {
    expect(normalizeGroup("glutes")).toBe("Glutes");
  });

  it("maps 'abductors' → Glutes (glutes-family)", () => {
    expect(normalizeGroup("abductors")).toBe("Glutes");
  });

  it("maps 'adductors' → Glutes (glutes-family)", () => {
    expect(normalizeGroup("adductors")).toBe("Glutes");
  });

  it("maps 'calves' → Calves", () => {
    expect(normalizeGroup("calves")).toBe("Calves");
  });

  it("maps 'neck' → Traps", () => {
    expect(normalizeGroup("neck")).toBe("Traps");
  });

  it("maps unknown → null (drop)", () => {
    expect(normalizeGroup("unknown_xyzzy")).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// refineMuscles
// ---------------------------------------------------------------------------

describe("refineMuscles", () => {
  it("'lateral raise' replaces side/shoulder muscles with side_delts", () => {
    const result = refineMuscles("Dumbbell Lateral Raise", ["side_delts"]);
    expect(result).toEqual(["side_delts"]);
  });

  it("'lat raise' triggers side_delts replacement", () => {
    const result = refineMuscles("Cable Lat Raise", ["side_delts"]);
    expect(result).toEqual(["side_delts"]);
  });

  it("'side raise' triggers side_delts replacement", () => {
    const result = refineMuscles("Dumbbell Side Raise", ["side_delts"]);
    expect(result).toEqual(["side_delts"]);
  });

  it("'overhead press' replaces shoulder muscles with front_delts", () => {
    const result = refineMuscles("Barbell Overhead Press", ["side_delts"]);
    expect(result).toContain("front_delts");
    expect(result).not.toContain("side_delts");
  });

  it("'ohp' triggers front_delts replacement", () => {
    const result = refineMuscles("Seated OHP", ["side_delts"]);
    expect(result).toContain("front_delts");
    expect(result).not.toContain("side_delts");
  });

  it("'arnold' triggers front_delts replacement", () => {
    const result = refineMuscles("Arnold Press", ["side_delts"]);
    expect(result).toContain("front_delts");
    expect(result).not.toContain("side_delts");
  });

  it("'shoulder press' triggers front_delts replacement", () => {
    const result = refineMuscles("Dumbbell Shoulder Press", ["side_delts"]);
    expect(result).toContain("front_delts");
    expect(result).not.toContain("side_delts");
  });

  it("'front raise' triggers front_delts replacement", () => {
    const result = refineMuscles("Dumbbell Front Raise", ["side_delts"]);
    expect(result).toContain("front_delts");
    expect(result).not.toContain("side_delts");
  });

  it("'face pull' triggers rear_delts replacement", () => {
    const result = refineMuscles("Face Pull", ["side_delts"]);
    expect(result).toContain("rear_delts");
    expect(result).not.toContain("side_delts");
  });

  it("'rear' in name triggers rear_delts replacement", () => {
    const result = refineMuscles("Rear Delt Fly", ["side_delts"]);
    expect(result).toContain("rear_delts");
    expect(result).not.toContain("side_delts");
  });

  it("'reverse fly' triggers rear_delts replacement", () => {
    const result = refineMuscles("Cable Reverse Fly", ["side_delts"]);
    expect(result).toContain("rear_delts");
    expect(result).not.toContain("side_delts");
  });

  it("'reverse pec' triggers rear_delts replacement", () => {
    const result = refineMuscles("Reverse Pec Deck", ["side_delts"]);
    expect(result).toContain("rear_delts");
    expect(result).not.toContain("side_delts");
  });

  it("'shrug' → upper_traps", () => {
    const result = refineMuscles("Barbell Shrug", ["upper_traps"]);
    expect(result).toContain("upper_traps");
  });

  it("'oblique' → adds obliques", () => {
    const result = refineMuscles("Oblique Crunch", ["abs"]);
    expect(result).toContain("obliques");
    expect(result).toContain("abs");
  });

  it("'twist' → adds obliques (russian twist)", () => {
    const result = refineMuscles("Russian Twist", ["abs"]);
    expect(result).toContain("obliques");
    expect(result).toContain("abs");
  });

  it("'woodchop' → adds obliques", () => {
    const result = refineMuscles("Cable Woodchop", ["abs"]);
    expect(result).toContain("obliques");
    expect(result).toContain("abs");
  });

  it("'side bend' → adds obliques", () => {
    const result = refineMuscles("Dumbbell Side Bend", ["abs"]);
    expect(result).toContain("obliques");
    expect(result).toContain("abs");
  });

  it("'row' → adds rhomboids as secondary", () => {
    const result = refineMuscles("Barbell Row", ["lats"]);
    expect(result).toContain("rhomboids");
    expect(result).toContain("lats");
  });

  it("'pulldown' → adds rhomboids as secondary", () => {
    const result = refineMuscles("Lat Pulldown", ["lats"]);
    expect(result).toContain("rhomboids");
    expect(result).toContain("lats");
  });

  it("'pull-up' → adds rhomboids as secondary", () => {
    const result = refineMuscles("Pull-Up", ["lats"]);
    expect(result).toContain("rhomboids");
    expect(result).toContain("lats");
  });

  it("'chin-up' → adds rhomboids as secondary", () => {
    const result = refineMuscles("Chin-Up", ["lats"]);
    expect(result).toContain("rhomboids");
    expect(result).toContain("lats");
  });

  it("is idempotent — calling twice gives same result", () => {
    const muscles: MuscleKey[] = ["lats"];
    const once = refineMuscles("Barbell Row", muscles);
    const twice = refineMuscles("Barbell Row", once);
    expect(twice).toEqual(once);
  });

  it("returns deduped list — no duplicates", () => {
    const result = refineMuscles("Barbell Row", ["lats", "rhomboids"]);
    const unique = [...new Set(result)];
    expect(result).toEqual(unique);
  });
});

// ---------------------------------------------------------------------------
// inferTracking
// ---------------------------------------------------------------------------

describe("inferTracking", () => {
  it("'plank' in name → duration", () => {
    const rec = rawRec({ name: "Plank", equipment: "body only", primaryMuscles: ["abdominals"] });
    expect(inferTracking(rec)).toBe("duration");
  });

  it("'hold' in name → duration", () => {
    const rec = rawRec({ name: "Hollow Hold", equipment: "body only", primaryMuscles: ["abdominals"] });
    expect(inferTracking(rec)).toBe("duration");
  });

  it("'hollow' in name → duration", () => {
    const rec = rawRec({ name: "Hollow Body", equipment: "body only", primaryMuscles: ["abdominals"] });
    expect(inferTracking(rec)).toBe("duration");
  });

  it("'l-sit' in name → duration", () => {
    const rec = rawRec({ name: "L-Sit Hold", equipment: "body only", primaryMuscles: ["abdominals"] });
    expect(inferTracking(rec)).toBe("duration");
  });

  it("'wall sit' in name → duration", () => {
    const rec = rawRec({ name: "Wall Sit", equipment: "body only", primaryMuscles: ["quadriceps"] });
    expect(inferTracking(rec)).toBe("duration");
  });

  it("'farmer' in name → weight_duration (farmer's carry)", () => {
    const rec = rawRec({ name: "Farmer's Walk", equipment: "dumbbell", primaryMuscles: ["forearms"] });
    expect(inferTracking(rec)).toBe("weight_duration");
  });

  it("'carry' in name → weight_duration", () => {
    const rec = rawRec({ name: "Suitcase Carry", equipment: "dumbbell", primaryMuscles: ["forearms"] });
    expect(inferTracking(rec)).toBe("weight_duration");
  });

  it("'pull-up' bodyweight → weighted_bodyweight", () => {
    const rec = rawRec({ name: "Pull-Up", equipment: "body only", primaryMuscles: ["lats"] });
    expect(inferTracking(rec)).toBe("weighted_bodyweight");
  });

  it("'chin-up' bodyweight → weighted_bodyweight", () => {
    const rec = rawRec({ name: "Chin-Up", equipment: "body only", primaryMuscles: ["lats"] });
    expect(inferTracking(rec)).toBe("weighted_bodyweight");
  });

  it("'dip' bodyweight → weighted_bodyweight", () => {
    const rec = rawRec({ name: "Dip", equipment: "body only", primaryMuscles: ["triceps"] });
    expect(inferTracking(rec)).toBe("weighted_bodyweight");
  });

  it("'assisted' in name → assisted_bodyweight", () => {
    const rec = rawRec({ name: "Assisted Pull-Up", equipment: "body only", primaryMuscles: ["lats"] });
    expect(inferTracking(rec)).toBe("assisted_bodyweight");
  });

  it("push-up (bodyweight, reps-style) → bodyweight_reps", () => {
    const rec = rawRec({ name: "Push-Up", equipment: "body only", primaryMuscles: ["chest"] });
    expect(inferTracking(rec)).toBe("bodyweight_reps");
  });

  it("barbell bench press → weight_reps", () => {
    const rec = rawRec({
      name: "Barbell Bench Press - Medium Grip",
      equipment: "barbell",
      primaryMuscles: ["chest"],
    });
    expect(inferTracking(rec)).toBe("weight_reps");
  });
});

// ---------------------------------------------------------------------------
// normalizeRecord
// ---------------------------------------------------------------------------

describe("normalizeRecord", () => {
  it("maps a valid barbell chest record correctly", () => {
    const rec = rawRec({
      id: "Barbell_Bench_Press_-_Medium_Grip",
      name: "Barbell Bench Press - Medium Grip",
      equipment: "barbell",
      primaryMuscles: ["chest"],
      secondaryMuscles: ["shoulders", "triceps"],
    });
    const result = normalizeRecord(rec);
    // Should not be null
    expect(result).not.toBe(null);
    // id preserved
    expect(result!.id).toBe("Barbell_Bench_Press_-_Medium_Grip");
    // equipment mapped
    expect(result!.equipment).toBe("barbell");
    // group mapped from chest
    expect(result!.group).toBe("Chest");
    // primary includes chest
    expect(result!.primary).toContain("chest");
    // tracking is weight_reps
    expect(result!.tracking).toBe("weight_reps");
  });

  it("returns null when equipment is unmappable (foam roll)", () => {
    const rec = rawRec({
      id: "Adductor",
      name: "Adductor",
      equipment: "foam roll",
      primaryMuscles: ["adductors"],
      secondaryMuscles: [],
    });
    expect(normalizeRecord(rec)).toBe(null);
  });

  it("returns null when equipment is null", () => {
    const rec = rawRec({
      equipment: null,
      primaryMuscles: ["abdominals"],
    });
    expect(normalizeRecord(rec)).toBe(null);
  });

  it("returns null when group is unmappable (unknown muscle)", () => {
    const rec = rawRec({
      equipment: "barbell",
      primaryMuscles: ["unknown_xyzzy"],
    });
    expect(normalizeRecord(rec)).toBe(null);
  });

  it("secondary muscles are mapped and included", () => {
    const rec = rawRec({
      equipment: "barbell",
      primaryMuscles: ["chest"],
      secondaryMuscles: ["triceps", "shoulders"],
    });
    const result = normalizeRecord(rec);
    expect(result).not.toBe(null);
    expect(result!.secondary).toContain("triceps");
  });

  it("sets timeBased=true for duration tracking", () => {
    const rec = rawRec({
      name: "Plank",
      equipment: "body only",
      primaryMuscles: ["abdominals"],
    });
    const result = normalizeRecord(rec);
    expect(result).not.toBe(null);
    expect(result!.timeBased).toBe(true);
  });

  it("sets timeBased=false for weight_reps tracking", () => {
    const rec = rawRec({
      name: "Barbell Bench Press",
      equipment: "barbell",
      primaryMuscles: ["chest"],
    });
    const result = normalizeRecord(rec);
    expect(result).not.toBe(null);
    expect(result!.timeBased).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mergeAndDedupe
// ---------------------------------------------------------------------------

describe("mergeAndDedupe", () => {
  const seedEx1 = makeExercise({ id: "ex-seed-1", name: "Bench Press", group: "Chest" });
  const seedEx2 = makeExercise({ id: "ex-seed-2", name: "Squat", group: "Quads", primary: ["quads"], equipment: "barbell" });
  const imported1 = makeExercise({ id: "ex-seed-1", name: "Bench Press Imported", group: "Chest" }); // same id
  const imported2 = makeExercise({ id: "ex-import-2", name: "Bench Press", group: "Chest" }); // same name, different id
  const imported3 = makeExercise({ id: "ex-import-3", name: "Deadlift", group: "Back", primary: ["lats"], equipment: "barbell" });

  it("seed wins on id collision", () => {
    const result = mergeAndDedupe([seedEx1], [imported1]);
    const bench = result.find((e) => e.id === "ex-seed-1");
    expect(bench).not.toBeUndefined();
    // Seed name (not imported name) should win
    expect(bench!.name).toBe("Bench Press");
  });

  it("seed wins on case-insensitive name collision", () => {
    const result = mergeAndDedupe([seedEx1], [imported2]);
    // ex-import-2 should be dropped since name "Bench Press" is in seed
    const importedMatch = result.find((e) => e.id === "ex-import-2");
    expect(importedMatch).toBeUndefined();
  });

  it("non-colliding imported exercises are included", () => {
    const result = mergeAndDedupe([seedEx1], [imported3]);
    const deadlift = result.find((e) => e.id === "ex-import-3");
    expect(deadlift).not.toBeUndefined();
    expect(deadlift!.name).toBe("Deadlift");
  });

  it("result is sorted by group then name", () => {
    const result = mergeAndDedupe([seedEx1, seedEx2], [imported3]);
    // Back < Chest < Quads alphabetically
    const groups = result.map((e) => e.group);
    const sorted = [...groups].sort();
    expect(groups).toEqual(sorted);
  });

  it("within the same group, sorted by name", () => {
    const a = makeExercise({ id: "a", name: "Zzzz", group: "Chest" });
    const b = makeExercise({ id: "b", name: "Aaaa", group: "Chest" });
    const result = mergeAndDedupe([a, b], []);
    const chestNames = result.filter((e) => e.group === "Chest").map((e) => e.name);
    expect(chestNames[0]).toBe("Aaaa");
    expect(chestNames[1]).toBe("Zzzz");
  });
});

// ---------------------------------------------------------------------------
// buildDataset (golden invariants on real source)
// ---------------------------------------------------------------------------

// Load the real source JSON synchronously at module level — it is read once.
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

const RAW_FREE_DB_PATH = fileURLToPath(
  new URL("../../packages/B02-dataset/data/source/free-exercise-db.json", import.meta.url),
);
const rawFreeDb: unknown = JSON.parse(readFileSync(RAW_FREE_DB_PATH, "utf-8"));

describe("buildDataset", () => {
  it("returns ≥300 exercises from the real source + empty seed", () => {
    const result = buildDataset(rawFreeDb, []);
    expect(result.length).toBeGreaterThanOrEqual(300);
  });

  it("all entries pass ExerciseSchema", () => {
    const result = buildDataset(rawFreeDb, []);
    for (const ex of result) {
      const parsed = ExerciseSchema.safeParse(ex);
      expect(parsed.success).toBe(true);
    }
  });

  it("no duplicate ids in output", () => {
    const result = buildDataset(rawFreeDb, []);
    const ids = result.map((e) => e.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// seed()
// ---------------------------------------------------------------------------

describe("seed()", () => {
  it("every entry passes ExerciseSchema", () => {
    const s = seed();
    for (const ex of s) {
      const parsed = ExerciseSchema.safeParse(ex);
      expect(parsed.success).toBe(true);
    }
  });

  it("returns ≥80 entries", () => {
    const s = seed();
    expect(s.length).toBeGreaterThanOrEqual(80);
  });

  it("spot check: bb-bench has group Chest", () => {
    const s = seed();
    const bench = s.find((e) => e.id === "bb-bench");
    expect(bench).not.toBeUndefined();
    expect(bench!.group).toBe("Chest");
  });

  it("spot check: bb-bench has primary chest", () => {
    const s = seed();
    const bench = s.find((e) => e.id === "bb-bench");
    expect(bench).not.toBeUndefined();
    expect(bench!.primary).toContain("chest");
  });

  it("spot check: bb-bench has tracking weight_reps", () => {
    const s = seed();
    const bench = s.find((e) => e.id === "bb-bench");
    expect(bench).not.toBeUndefined();
    expect(bench!.tracking).toBe("weight_reps");
  });

  it("no duplicate ids in seed", () => {
    const s = seed();
    const ids = s.map((e) => e.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
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

  it("returns ≥300 exercises (full built dataset)", () => {
    const exs = exercises();
    expect(exs.length).toBeGreaterThanOrEqual(300);
  });

  it("all entries pass ExerciseSchema", () => {
    const exs = exercises();
    for (const ex of exs) {
      const parsed = ExerciseSchema.safeParse(ex);
      expect(parsed.success).toBe(true);
    }
  });

  it("no duplicate ids", () => {
    const exs = exercises();
    const ids = exs.map((e) => e.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// createLibrary and Library accessors
// ---------------------------------------------------------------------------

describe("createLibrary", () => {
  // Fixtures declared at describe scope (pure data, no throwing)
  const ex1 = makeExercise({ id: "lib-1", name: "Bench Press", group: "Chest", primary: ["chest"], secondary: ["triceps"], equipment: "barbell" });
  const ex2 = makeExercise({ id: "lib-2", name: "Squat", group: "Quads", primary: ["quads"], secondary: ["glutes", "hamstrings"], equipment: "barbell" });
  const ex3 = makeExercise({ id: "lib-3", name: "pull-up", group: "Back", primary: ["lats"], secondary: ["biceps"], equipment: "bodyweight", tracking: "weighted_bodyweight" });
  const ex4 = makeExercise({ id: "lib-4", name: "Curl", group: "Biceps", primary: ["biceps"], secondary: [], equipment: "dumbbell" });
  const customEx = makeExercise({ id: "cust-1", name: "Custom Move", group: "Chest", primary: ["chest"], secondary: [], equipment: "bodyweight", custom: true });

  // createLibrary throws "not implemented" — call it inside each test
  describe("all()", () => {
    it("returns the full input array", () => {
      const lib = createLibrary([ex1, ex2, ex3, ex4]);
      expect(lib.all()).toEqual([ex1, ex2, ex3, ex4]);
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
      const extraChest = makeExercise({ id: "extra-chest", name: "Cable Fly", group: "Chest", primary: ["chest"], secondary: [], equipment: "cable" });
      const lib2 = createLibrary([ex1, extraChest]);
      const results = lib2.byGroup("Chest");
      expect(results.length).toBe(2);
    });
  });

  describe("filterByProfile()", () => {
    it("keeps exercises whose equipment is in the profile", () => {
      const lib = createLibrary([ex1, ex2, ex3, ex4]);
      const results = lib.filterByProfile(["barbell"]);
      // ex1 and ex2 both use barbell
      expect(results.map((e) => e.id).sort()).toEqual(["lib-1", "lib-2"]);
    });

    it("drops exercises whose equipment is not in the profile", () => {
      const lib = createLibrary([ex1, ex2, ex3, ex4]);
      const results = lib.filterByProfile(["cable"]);
      expect(results).toEqual([]);
    });

    it("always keeps custom exercises regardless of equipment", () => {
      const libWithCustom = createLibrary([ex1, customEx]);
      const results = libWithCustom.filterByProfile(["cable"]);
      // ex1 (barbell) should be excluded, but customEx should be kept
      expect(results.map((e) => e.id)).toContain("cust-1");
      expect(results.map((e) => e.id)).not.toContain("lib-1");
    });

    it("keeps both in-profile and custom exercises", () => {
      const libWithCustom = createLibrary([ex1, customEx]);
      const results = libWithCustom.filterByProfile(["barbell"]);
      const ids = results.map((e) => e.id).sort();
      expect(ids).toContain("lib-1");
      expect(ids).toContain("cust-1");
    });
  });

  describe("musclesOf()", () => {
    it("returns union of primary and secondary muscles", () => {
      const lib = createLibrary([ex1, ex2, ex3, ex4]);
      const muscles = lib.musclesOf(ex1);
      expect(muscles).toContain("chest");
      expect(muscles).toContain("triceps");
    });

    it("deduplicates muscles", () => {
      const lib = createLibrary([ex1]);
      const dupEx = makeExercise({ id: "dup-ex", name: "Overlap", group: "Chest", primary: ["chest"], secondary: ["chest"] });
      const muscles = lib.musclesOf(dupEx);
      const uniqueMuscles = [...new Set(muscles)];
      expect(muscles).toEqual(uniqueMuscles);
    });

    it("includes all primary and secondary muscles", () => {
      const lib = createLibrary([ex1, ex2, ex3, ex4]);
      const muscles = lib.musclesOf(ex2);
      expect(muscles).toContain("quads");
      expect(muscles).toContain("glutes");
      expect(muscles).toContain("hamstrings");
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
      expect(extended.all().length).toBe(5); // 4 base + 1 custom
    });
  });
});

// ---------------------------------------------------------------------------
// defaultLibrary()
// ---------------------------------------------------------------------------

describe("defaultLibrary()", () => {
  it("returns a library with all exercises from exercises()", () => {
    const lib = defaultLibrary();
    const all = lib.all();
    expect(all.length).toBeGreaterThanOrEqual(300);
  });

  it("byId works on the default library", () => {
    // The default library should have exercises from the built dataset
    const lib = defaultLibrary();
    const all = lib.all();
    // Take a known id from the result and look it up
    const first = all[0];
    expect(lib.byId(first.id)).toEqual(first);
  });
});
