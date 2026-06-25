// @nabd/dataset — exercise library: offline re-tag pipeline + runtime accessors.

import type { Exercise, Equipment, MuscleKey, MuscleGroup } from "@nabd/domain";
import { ExerciseSchema, isTimeBased } from "@nabd/domain";
import exercisesJson from "../data/exercises.json" assert { type: "json" };

/** Shape of one record in the free-exercise-db source snapshot. */
export interface RawExercise {
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
  id: string;
}

// ----- Pipeline (offline build + unit-tested) -----

/** Map a free-exercise-db equipment string to our key, or null if unsupported. */
export function normalizeEquipment(src: string | null): Equipment | null {
  if (src === null) return null;
  switch (src) {
    case "body only":
      return "bodyweight";
    case "dumbbell":
      return "dumbbell";
    case "barbell":
      return "barbell";
    case "e-z curl bar":
      return "ezbar";
    case "kettlebells":
      return "kettlebell";
    case "bands":
      return "bands";
    case "cable":
      return "cable";
    case "machine":
      return "machine";
    case "exercise ball":
    case "medicine ball":
      return "bodyweight";
    default:
      return null;
  }
}

/** Map a coarse source muscle name to zero or more of our 23 keys. */
export function normalizeMuscle(src: string): MuscleKey[] {
  switch (src) {
    case "abdominals":
      return ["abs"];
    case "lower back":
      return ["lower_back"];
    case "middle back":
      return ["rhomboids"];
    case "traps":
      return ["upper_traps"];
    case "shoulders":
      return ["side_delts"];
    case "quadriceps":
      return ["quads"];
    case "chest":
      return ["chest"];
    case "lats":
      return ["lats"];
    case "biceps":
      return ["biceps"];
    case "triceps":
      return ["triceps"];
    case "forearms":
      return ["forearms"];
    case "calves":
      return ["calves"];
    case "glutes":
      return ["glutes"];
    case "hamstrings":
      return ["hamstrings"];
    case "abductors":
      return ["abductors"];
    case "adductors":
      return ["adductors"];
    case "neck":
      return ["neck"];
    default:
      return [];
  }
}

/** Map a source muscle name to our planner group. */
export function normalizeGroup(primarySource: string): MuscleGroup | null {
  switch (primarySource) {
    case "abdominals":
      return "Abs";
    case "chest":
      return "Chest";
    case "lats":
    case "middle back":
    case "lower back":
      return "Back";
    case "traps":
      return "Traps";
    case "shoulders":
      return "Shoulders";
    case "triceps":
      return "Triceps";
    case "biceps":
      return "Biceps";
    case "forearms":
      return "Forearms";
    case "quadriceps":
      return "Quads";
    case "hamstrings":
      return "Hamstrings";
    case "glutes":
    case "abductors":
    case "adductors":
      return "Glutes";
    case "calves":
      return "Calves";
    case "neck":
      return "Traps";
    default:
      return null;
  }
}

/** Infer a tracking type from name/force/mechanic/category/equipment. */
export function inferTracking(rec: RawExercise): import("@nabd/domain").TrackingType {
  const name = rec.name.toLowerCase();

  // Duration holds
  if (
    name.includes("plank") ||
    name.includes("hold") ||
    name.includes("hollow") ||
    name.includes("l-sit") ||
    name.includes("wall sit")
  ) {
    return "duration";
  }

  // Weight + duration (carries)
  if (name.includes("carry") || name.includes("farmer")) {
    return "weight_duration";
  }

  // Distance + duration (cardio)
  if (
    name.includes("run") ||
    name.includes("sprint") ||
    name.includes("bike") ||
    (name.includes("row") && rec.equipment === null)
  ) {
    return "distance_duration";
  }

  // Assisted bodyweight (check before weighted_bodyweight)
  if (name.includes("assisted")) {
    return "assisted_bodyweight";
  }

  // Weighted bodyweight (pull-ups, dips)
  if (name.includes("pull-up") || name.includes("chin-up") || name.includes("dip")) {
    return "weighted_bodyweight";
  }

  // Bodyweight reps (no external weight equipment)
  const eq = normalizeEquipment(rec.equipment);
  if (eq === "bodyweight") {
    return "bodyweight_reps";
  }

  return "weight_reps";
}

/**
 * Refine shoulder/back coarse tags into specific heads using the exercise name
 * (e.g. "lateral raise" -> side_delts, "rear/reverse fly|face pull" -> rear_delts,
 * "front raise|overhead press" -> front_delts; "row|pulldown" adds rhomboids).
 */
export function refineMuscles(name: string, muscles: MuscleKey[]): MuscleKey[] {
  const n = name.toLowerCase();
  let result = [...muscles];

  const isShoulderMuscle = (m: MuscleKey) =>
    m === "side_delts" || m === "front_delts" || m === "rear_delts";

  // Side delts
  if (n.includes("lateral raise") || n.includes("lat raise") || n.includes("side raise")) {
    result = result.filter((m) => !isShoulderMuscle(m));
    if (!result.includes("side_delts")) result.push("side_delts");
  }
  // Front delts
  else if (
    n.includes("front raise") ||
    n.includes("overhead press") ||
    n.includes("ohp") ||
    n.includes("arnold") ||
    n.includes("shoulder press")
  ) {
    result = result.filter((m) => !isShoulderMuscle(m));
    if (!result.includes("front_delts")) result.push("front_delts");
  }
  // Rear delts
  else if (
    n.includes("rear") ||
    n.includes("reverse fly") ||
    n.includes("reverse pec") ||
    n.includes("face pull")
  ) {
    result = result.filter((m) => !isShoulderMuscle(m));
    if (!result.includes("rear_delts")) result.push("rear_delts");
  }

  // Shrug → upper_traps
  if (n.includes("shrug")) {
    if (!result.includes("upper_traps")) result.push("upper_traps");
  }

  // Obliques
  if (
    n.includes("oblique") ||
    n.includes("twist") ||
    n.includes("woodchop") ||
    n.includes("side bend")
  ) {
    if (!result.includes("obliques")) result.push("obliques");
  }

  // Row/pulldown/pull-up/chin-up → add rhomboids
  if (
    n.includes("row") ||
    n.includes("pulldown") ||
    n.includes("pull-up") ||
    n.includes("chin-up")
  ) {
    if (!result.includes("rhomboids")) result.push("rhomboids");
  }

  // Deduplicate
  return [...new Set(result)];
}

/** Normalize one raw record into our Exercise, or null if it cannot be mapped. */
export function normalizeRecord(rec: RawExercise): Exercise | null {
  const equipment = normalizeEquipment(rec.equipment);
  if (equipment === null) return null;

  const primarySource = rec.primaryMuscles[0] as string;
  const group = normalizeGroup(primarySource);
  if (group === null) return null;

  const primaryMapped = rec.primaryMuscles.flatMap((m) => normalizeMuscle(m));
  const secondaryMapped = rec.secondaryMuscles.flatMap((m) => normalizeMuscle(m));

  const allMuscles = [...primaryMapped, ...secondaryMapped];
  const refined = refineMuscles(rec.name, allMuscles);

  // Split refined back into primary vs secondary.
  // If a shoulder muscle (side_delts) was replaced via refineMuscles, the replacement
  // (front_delts/rear_delts/side_delts) should be counted as primary.
  const primaryMappedSet = new Set(primaryMapped);
  const primaryFinal: MuscleKey[] = [];
  const secondaryFinal: MuscleKey[] = [];

  const hasShoulderPrimary = primaryMappedSet.has("side_delts");
  if (hasShoulderPrimary) {
    // side_delts was replaced in refined; find the delt replacement as primary.
    const replacement = refined.find(
      (m) => m === "front_delts" || m === "rear_delts" || m === "side_delts",
    )!;
    primaryFinal.push(replacement);
    for (const m of refined) {
      if (m !== replacement) secondaryFinal.push(m);
    }
  } else {
    for (const m of refined) {
      if (primaryMappedSet.has(m)) {
        primaryFinal.push(m);
      } else {
        secondaryFinal.push(m);
      }
    }
  }

  const tracking = inferTracking(rec);
  const timeBased = isTimeBased(tracking);

  const exercise: Exercise = {
    id: rec.id,
    name: rec.name,
    group,
    primary: [...new Set(primaryFinal)],
    secondary: [...new Set(secondaryFinal)],
    equipment,
    tracking,
    timeBased,
  };

  return exercise;
}

/** Merge re-tagged imports with the seed; seed wins on id/name collisions. */
export function mergeAndDedupe(seedExercises: Exercise[], imported: Exercise[]): Exercise[] {
  const seedIds = new Set(seedExercises.map((e) => e.id));
  const seedNames = new Set(seedExercises.map((e) => e.name.toLowerCase()));

  const filtered = imported.filter(
    (e) => !seedIds.has(e.id) && !seedNames.has(e.name.toLowerCase()),
  );

  const combined = [...seedExercises, ...filtered];

  return combined.sort((a, b) => {
    const groupCmp = a.group.localeCompare(b.group);
    if (groupCmp !== 0) return groupCmp;
    return a.name.localeCompare(b.name);
  });
}

/** Full build: raw free-exercise-db + seed -> validated, deduped dataset. */
export function buildDataset(rawFreeDb: unknown, seedData: Exercise[]): Exercise[] {
  const records = rawFreeDb as RawExercise[];
  const normalized = records.flatMap((rec) => {
    const result = normalizeRecord(rec);
    return result !== null ? [result] : [];
  });

  const merged = mergeAndDedupe(seedData, normalized);

  for (const ex of merged) {
    ExerciseSchema.parse(ex);
  }

  return merged;
}

/** The handoff seed library, re-tagged into the 23-muscle taxonomy. */
export function seed(): Exercise[] {
  return [
    // Chest
    {
      id: "bb-bench",
      name: "Barbell Bench Press",
      group: "Chest",
      primary: ["chest"],
      secondary: ["triceps", "front_delts"],
      equipment: "barbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "incline-bb-bench",
      name: "Incline Barbell Press",
      group: "Chest",
      primary: ["chest"],
      secondary: ["front_delts", "triceps"],
      equipment: "barbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "db-bench",
      name: "Dumbbell Bench Press",
      group: "Chest",
      primary: ["chest"],
      secondary: ["triceps", "front_delts"],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "incline-db-press",
      name: "Incline Dumbbell Press",
      group: "Chest",
      primary: ["chest"],
      secondary: ["front_delts", "triceps"],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "pushup",
      name: "Push-up",
      group: "Chest",
      primary: ["chest"],
      secondary: ["triceps", "front_delts"],
      equipment: "bodyweight",
      tracking: "bodyweight_reps",
      timeBased: false,
    },
    {
      id: "dips",
      name: "Chest Dip",
      group: "Chest",
      primary: ["chest"],
      secondary: ["triceps", "front_delts"],
      equipment: "bodyweight",
      tracking: "weighted_bodyweight",
      timeBased: false,
    },
    {
      id: "db-fly",
      name: "Dumbbell Fly",
      group: "Chest",
      primary: ["chest"],
      secondary: [],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "cable-fly",
      name: "Cable Fly",
      group: "Chest",
      primary: ["chest"],
      secondary: [],
      equipment: "cable",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "pec-deck",
      name: "Pec Deck",
      group: "Chest",
      primary: ["chest"],
      secondary: [],
      equipment: "machine",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "smith-incline",
      name: "Smith Incline Press",
      group: "Chest",
      primary: ["chest"],
      secondary: ["front_delts", "triceps"],
      equipment: "smith",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "band-press",
      name: "Band Chest Press",
      group: "Chest",
      primary: ["chest"],
      secondary: ["triceps"],
      equipment: "bands",
      tracking: "weight_reps",
      timeBased: false,
    },

    // Back
    {
      id: "pullup",
      name: "Pull-up",
      group: "Back",
      primary: ["lats"],
      secondary: ["biceps", "rhomboids"],
      equipment: "pullupbar",
      tracking: "weighted_bodyweight",
      timeBased: false,
    },
    {
      id: "chinup",
      name: "Chin-up",
      group: "Back",
      primary: ["lats"],
      secondary: ["biceps", "rhomboids"],
      equipment: "pullupbar",
      tracking: "weighted_bodyweight",
      timeBased: false,
    },
    {
      id: "lat-pulldown",
      name: "Lat Pulldown",
      group: "Back",
      primary: ["lats"],
      secondary: ["biceps", "rhomboids"],
      equipment: "cable",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "bb-row",
      name: "Barbell Row",
      group: "Back",
      primary: ["lats"],
      secondary: ["biceps", "upper_traps", "rhomboids"],
      equipment: "barbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "pendlay-row",
      name: "Pendlay Row",
      group: "Back",
      primary: ["lats"],
      secondary: ["biceps", "rhomboids"],
      equipment: "barbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "db-row",
      name: "One-Arm Dumbbell Row",
      group: "Back",
      primary: ["lats"],
      secondary: ["biceps", "rhomboids"],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "cable-row",
      name: "Seated Cable Row",
      group: "Back",
      primary: ["lats"],
      secondary: ["biceps", "rhomboids"],
      equipment: "cable",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "csr",
      name: "Chest-Supported Row",
      group: "Back",
      primary: ["lats"],
      secondary: ["biceps", "rhomboids"],
      equipment: "machine",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "tbar",
      name: "T-Bar Row",
      group: "Back",
      primary: ["lats"],
      secondary: ["biceps", "upper_traps", "rhomboids"],
      equipment: "barbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "inverted-row",
      name: "Inverted Row",
      group: "Back",
      primary: ["lats"],
      secondary: ["biceps", "rhomboids"],
      equipment: "bodyweight",
      tracking: "bodyweight_reps",
      timeBased: false,
    },
    {
      id: "band-pulldown",
      name: "Band Lat Pulldown",
      group: "Back",
      primary: ["lats"],
      secondary: ["biceps", "rhomboids"],
      equipment: "bands",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "straight-arm",
      name: "Straight-Arm Pulldown",
      group: "Back",
      primary: ["lats"],
      secondary: [],
      equipment: "cable",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "deadlift",
      name: "Deadlift",
      group: "Back",
      primary: ["lats", "glutes", "hamstrings"],
      secondary: ["upper_traps", "lower_back"],
      equipment: "barbell",
      tracking: "weight_reps",
      timeBased: false,
    },

    // Traps
    {
      id: "bb-shrug",
      name: "Barbell Shrug",
      group: "Traps",
      primary: ["upper_traps"],
      secondary: [],
      equipment: "barbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "db-shrug",
      name: "Dumbbell Shrug",
      group: "Traps",
      primary: ["upper_traps"],
      secondary: [],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "face-pull",
      name: "Face Pull",
      group: "Traps",
      primary: ["rear_delts"],
      secondary: ["upper_traps"],
      equipment: "cable",
      tracking: "weight_reps",
      timeBased: false,
    },

    // Shoulders
    {
      id: "ohp",
      name: "Overhead Press",
      group: "Shoulders",
      primary: ["front_delts"],
      secondary: ["triceps"],
      equipment: "barbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "db-shoulder-press",
      name: "Seated DB Shoulder Press",
      group: "Shoulders",
      primary: ["front_delts"],
      secondary: ["triceps"],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "arnold",
      name: "Arnold Press",
      group: "Shoulders",
      primary: ["front_delts"],
      secondary: ["triceps"],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "lat-raise",
      name: "Lateral Raise",
      group: "Shoulders",
      primary: ["side_delts"],
      secondary: [],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "cable-lat-raise",
      name: "Cable Lateral Raise",
      group: "Shoulders",
      primary: ["side_delts"],
      secondary: [],
      equipment: "cable",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "rear-fly",
      name: "Rear Delt Fly",
      group: "Shoulders",
      primary: ["rear_delts"],
      secondary: [],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "reverse-pecdeck",
      name: "Reverse Pec Deck",
      group: "Shoulders",
      primary: ["rear_delts"],
      secondary: [],
      equipment: "machine",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "band-lat-raise",
      name: "Band Lateral Raise",
      group: "Shoulders",
      primary: ["side_delts"],
      secondary: [],
      equipment: "bands",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "pike-pushup",
      name: "Pike Push-up",
      group: "Shoulders",
      primary: ["front_delts"],
      secondary: ["triceps"],
      equipment: "bodyweight",
      tracking: "bodyweight_reps",
      timeBased: false,
    },
    {
      id: "upright-row",
      name: "Upright Row",
      group: "Shoulders",
      primary: ["side_delts"],
      secondary: ["upper_traps"],
      equipment: "barbell",
      tracking: "weight_reps",
      timeBased: false,
    },

    // Triceps
    {
      id: "rope-pushdown",
      name: "Triceps Rope Pushdown",
      group: "Triceps",
      primary: ["triceps"],
      secondary: [],
      equipment: "cable",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "oh-cable-ext",
      name: "Overhead Cable Extension",
      group: "Triceps",
      primary: ["triceps"],
      secondary: [],
      equipment: "cable",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "skullcrusher",
      name: "Skull Crusher",
      group: "Triceps",
      primary: ["triceps"],
      secondary: [],
      equipment: "ezbar",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "cgbp",
      name: "Close-Grip Bench Press",
      group: "Triceps",
      primary: ["triceps"],
      secondary: ["chest"],
      equipment: "barbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "db-oh-ext",
      name: "DB Overhead Extension",
      group: "Triceps",
      primary: ["triceps"],
      secondary: [],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "bench-dip",
      name: "Bench Dip",
      group: "Triceps",
      primary: ["triceps"],
      secondary: [],
      equipment: "bodyweight",
      tracking: "bodyweight_reps",
      timeBased: false,
    },
    {
      id: "band-pushdown",
      name: "Band Pushdown",
      group: "Triceps",
      primary: ["triceps"],
      secondary: [],
      equipment: "bands",
      tracking: "weight_reps",
      timeBased: false,
    },

    // Biceps
    {
      id: "bb-curl",
      name: "Barbell Curl",
      group: "Biceps",
      primary: ["biceps"],
      secondary: [],
      equipment: "barbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "ez-curl",
      name: "EZ-Bar Curl",
      group: "Biceps",
      primary: ["biceps"],
      secondary: [],
      equipment: "ezbar",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "db-curl",
      name: "Dumbbell Curl",
      group: "Biceps",
      primary: ["biceps"],
      secondary: [],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "hammer-curl",
      name: "Hammer Curl",
      group: "Biceps",
      primary: ["biceps"],
      secondary: ["forearms"],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "incline-curl",
      name: "Incline DB Curl",
      group: "Biceps",
      primary: ["biceps"],
      secondary: [],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "cable-curl",
      name: "Cable Curl",
      group: "Biceps",
      primary: ["biceps"],
      secondary: [],
      equipment: "cable",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "preacher-curl",
      name: "Preacher Curl",
      group: "Biceps",
      primary: ["biceps"],
      secondary: [],
      equipment: "machine",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "band-curl",
      name: "Band Curl",
      group: "Biceps",
      primary: ["biceps"],
      secondary: [],
      equipment: "bands",
      tracking: "weight_reps",
      timeBased: false,
    },

    // Forearms
    {
      id: "wrist-curl",
      name: "Wrist Curl",
      group: "Forearms",
      primary: ["forearms"],
      secondary: [],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "reverse-curl",
      name: "Reverse Curl",
      group: "Forearms",
      primary: ["forearms"],
      secondary: ["biceps"],
      equipment: "ezbar",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "farmer-carry",
      name: "Farmer Carry",
      group: "Forearms",
      primary: ["forearms"],
      secondary: ["upper_traps"],
      equipment: "dumbbell",
      tracking: "weight_duration",
      timeBased: true,
    },

    // Quads
    {
      id: "back-squat",
      name: "Back Squat",
      group: "Quads",
      primary: ["quads"],
      secondary: ["glutes", "hamstrings"],
      equipment: "barbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "front-squat",
      name: "Front Squat",
      group: "Quads",
      primary: ["quads"],
      secondary: ["glutes"],
      equipment: "barbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "goblet-squat",
      name: "Goblet Squat",
      group: "Quads",
      primary: ["quads"],
      secondary: ["glutes"],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "leg-press",
      name: "Leg Press",
      group: "Quads",
      primary: ["quads"],
      secondary: ["glutes"],
      equipment: "machine",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "bulgarian",
      name: "Bulgarian Split Squat",
      group: "Quads",
      primary: ["quads"],
      secondary: ["glutes"],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "walking-lunge",
      name: "Walking Lunge",
      group: "Quads",
      primary: ["quads"],
      secondary: ["glutes"],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "leg-ext",
      name: "Leg Extension",
      group: "Quads",
      primary: ["quads"],
      secondary: [],
      equipment: "machine",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "hack-squat",
      name: "Hack Squat",
      group: "Quads",
      primary: ["quads"],
      secondary: ["glutes"],
      equipment: "machine",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "smith-squat",
      name: "Smith Squat",
      group: "Quads",
      primary: ["quads"],
      secondary: ["glutes"],
      equipment: "smith",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "bw-squat",
      name: "Bodyweight Squat",
      group: "Quads",
      primary: ["quads"],
      secondary: ["glutes"],
      equipment: "bodyweight",
      tracking: "bodyweight_reps",
      timeBased: false,
    },
    {
      id: "step-up",
      name: "Step-up",
      group: "Quads",
      primary: ["quads"],
      secondary: ["glutes"],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },

    // Hamstrings
    {
      id: "rdl",
      name: "Romanian Deadlift",
      group: "Hamstrings",
      primary: ["hamstrings"],
      secondary: ["glutes", "lower_back"],
      equipment: "barbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "db-rdl",
      name: "Dumbbell RDL",
      group: "Hamstrings",
      primary: ["hamstrings"],
      secondary: ["glutes"],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "lying-curl",
      name: "Lying Leg Curl",
      group: "Hamstrings",
      primary: ["hamstrings"],
      secondary: [],
      equipment: "machine",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "seated-curl",
      name: "Seated Leg Curl",
      group: "Hamstrings",
      primary: ["hamstrings"],
      secondary: [],
      equipment: "machine",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "nordic",
      name: "Nordic Curl",
      group: "Hamstrings",
      primary: ["hamstrings"],
      secondary: [],
      equipment: "bodyweight",
      tracking: "bodyweight_reps",
      timeBased: false,
    },
    {
      id: "good-morning",
      name: "Good Morning",
      group: "Hamstrings",
      primary: ["hamstrings"],
      secondary: ["glutes", "lower_back"],
      equipment: "barbell",
      tracking: "weight_reps",
      timeBased: false,
    },

    // Glutes
    {
      id: "hip-thrust",
      name: "Hip Thrust",
      group: "Glutes",
      primary: ["glutes"],
      secondary: ["hamstrings"],
      equipment: "barbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "glute-bridge",
      name: "Glute Bridge",
      group: "Glutes",
      primary: ["glutes"],
      secondary: [],
      equipment: "bodyweight",
      tracking: "bodyweight_reps",
      timeBased: false,
    },
    {
      id: "cable-kickback",
      name: "Cable Kickback",
      group: "Glutes",
      primary: ["glutes"],
      secondary: [],
      equipment: "cable",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "kb-swing",
      name: "Kettlebell Swing",
      group: "Glutes",
      primary: ["glutes"],
      secondary: ["hamstrings"],
      equipment: "kettlebell",
      tracking: "weight_reps",
      timeBased: false,
    },

    // Calves
    {
      id: "standing-calf",
      name: "Standing Calf Raise",
      group: "Calves",
      primary: ["calves"],
      secondary: [],
      equipment: "machine",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "seated-calf",
      name: "Seated Calf Raise",
      group: "Calves",
      primary: ["calves"],
      secondary: [],
      equipment: "machine",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "db-calf",
      name: "Dumbbell Calf Raise",
      group: "Calves",
      primary: ["calves"],
      secondary: [],
      equipment: "dumbbell",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "bw-calf",
      name: "Bodyweight Calf Raise",
      group: "Calves",
      primary: ["calves"],
      secondary: [],
      equipment: "bodyweight",
      tracking: "bodyweight_reps",
      timeBased: false,
    },

    // Abs
    {
      id: "plank",
      name: "Plank",
      group: "Abs",
      primary: ["abs"],
      secondary: ["obliques"],
      equipment: "bodyweight",
      tracking: "duration",
      timeBased: true,
    },
    {
      id: "hlr",
      name: "Hanging Leg Raise",
      group: "Abs",
      primary: ["abs"],
      secondary: [],
      equipment: "pullupbar",
      tracking: "bodyweight_reps",
      timeBased: false,
    },
    {
      id: "cable-crunch",
      name: "Cable Crunch",
      group: "Abs",
      primary: ["abs"],
      secondary: [],
      equipment: "cable",
      tracking: "weight_reps",
      timeBased: false,
    },
    {
      id: "ab-wheel",
      name: "Ab Wheel Rollout",
      group: "Abs",
      primary: ["abs"],
      secondary: [],
      equipment: "bodyweight",
      tracking: "bodyweight_reps",
      timeBased: false,
    },
    {
      id: "russian-twist",
      name: "Russian Twist",
      group: "Abs",
      primary: ["obliques"],
      secondary: ["abs"],
      equipment: "bodyweight",
      tracking: "bodyweight_reps",
      timeBased: false,
    },
    {
      id: "side-plank",
      name: "Side Plank",
      group: "Abs",
      primary: ["obliques"],
      secondary: [],
      equipment: "bodyweight",
      tracking: "duration",
      timeBased: true,
    },
    {
      id: "hollow-hold",
      name: "Hollow Hold",
      group: "Abs",
      primary: ["abs"],
      secondary: [],
      equipment: "bodyweight",
      tracking: "duration",
      timeBased: true,
    },
  ];
}

/** The bundled, built dataset (data/exercises.json). */
export function exercises(): Exercise[] {
  return exercisesJson as Exercise[];
}

// ----- Runtime accessors -----

export interface Library {
  all(): Exercise[];
  byId(id: string): Exercise | undefined;
  search(q: string): Exercise[];
  byGroup(group: MuscleGroup): Exercise[];
  /** Exercises whose equipment is in the given profile equipment set. */
  filterByProfile(equipment: Equipment[]): Exercise[];
  /** Combined primary+secondary muscles of an exercise. */
  musclesOf(ex: Exercise): MuscleKey[];
  /** A new Library that also includes the given custom exercises. */
  withCustom(custom: Exercise[]): Library;
}

/** Build a Library over an explicit exercise array (used in tests + app). */
export function createLibrary(exs: Exercise[]): Library {
  return {
    all(): Exercise[] {
      return exs;
    },
    byId(id: string): Exercise | undefined {
      return exs.find((e) => e.id === id);
    },
    search(q: string): Exercise[] {
      const lower = q.toLowerCase();
      return exs.filter((e) => e.name.toLowerCase().includes(lower));
    },
    byGroup(group: MuscleGroup): Exercise[] {
      return exs.filter((e) => e.group === group);
    },
    filterByProfile(equipment: Equipment[]): Exercise[] {
      const eqSet = new Set(equipment);
      return exs.filter((e) => e.custom === true || eqSet.has(e.equipment));
    },
    musclesOf(ex: Exercise): MuscleKey[] {
      return [...new Set([...ex.primary, ...ex.secondary])];
    },
    withCustom(custom: Exercise[]): Library {
      return createLibrary([...exs, ...custom]);
    },
  };
}

/** Default library over the bundled EXERCISES. */
export function defaultLibrary(): Library {
  return createLibrary(exercises());
}
