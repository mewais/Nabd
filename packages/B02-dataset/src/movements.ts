/**
 * @nabd/dataset — Movement catalog + compose engine.
 *
 * A Movement owns the muscle tags. compose() expands movements over
 * compatible equipment × applicable laterality to produce Exercise[].
 */

import type { Equipment, Exercise, MuscleGroup, MuscleKey, TrackingType } from "@nabd/domain";
import { MUSCLE_PRIMARY_GROUP } from "@nabd/domain";

// ---------------------------------------------------------------------------
// Name-only singular equipment prefix map (does NOT change EQUIPMENT_NAMES)
// ---------------------------------------------------------------------------

const EQUIPMENT_NAME_PREFIX: Record<Equipment, string> = {
  bodyweight: "",
  dumbbell: "Dumbbell",
  barbell: "Barbell",
  ezbar: "EZ-Bar",
  kettlebell: "Kettlebell",
  bands: "Band",
  pullupbar: "",
  bench: "Bench",
  cable: "Cable",
  machine: "Machine",
  smith: "Smith Machine",
};

// ---------------------------------------------------------------------------
// Leg / glute muscles (used for Single-Leg naming decision)
// ---------------------------------------------------------------------------

const LEG_MUSCLES: ReadonlySet<MuscleKey> = new Set<MuscleKey>([
  "quads",
  "hamstrings",
  "glutes",
  "abductors",
  "adductors",
  "calves",
  "tibialis",
  "hip_flexors",
]);

// ---------------------------------------------------------------------------
// Movement model
// ---------------------------------------------------------------------------

export type Laterality = "bilateral" | "unilateral";

export interface Movement {
  /** Base slug, e.g. "bench_press", "incline_bench_press". */
  id: string;
  /** Display name, e.g. "Bench Press". */
  name: string;
  /** Prime movers ONLY. */
  primary: MuscleKey[];
  /** Assisting muscles ONLY. */
  secondary: MuscleKey[];
  /** Compatible equipment list. */
  equipment: Equipment[];
  /** Defaults to ["bilateral"]. Add "unilateral" only where anatomically real. */
  laterality: Laterality[];
  /** Override tracking type (bypasses auto-inference). */
  tracking?: TrackingType;
  /** Override timeBased flag. */
  timeBased?: boolean;
  /**
   * Per-key display-name overrides. Key is equipment key OR "uni".
   * e.g. { bodyweight: "Push-Up", uni: "Single-Arm Push-Up" }
   */
  nameOverride?: Partial<Record<string, string>>;
}

// ---------------------------------------------------------------------------
// compose()
// ---------------------------------------------------------------------------

function isLower(primary0: MuscleKey): boolean {
  return LEG_MUSCLES.has(primary0);
}

function deriveTracking(m: Movement, eq: Equipment): TrackingType {
  if (m.tracking) return m.tracking;
  if (m.timeBased) return "duration";
  if (eq === "bodyweight") return "bodyweight_reps";
  return "weight_reps";
}

function deriveTimeBased(tracking: TrackingType, m: Movement): boolean {
  if (m.timeBased !== undefined) return m.timeBased;
  return tracking === "duration" || tracking === "weight_duration" || tracking === "distance_duration";
}

function deriveName(m: Movement, eq: Equipment, uni: boolean): string {
  // Unilateral override takes priority
  if (uni && m.nameOverride?.["uni"]) return m.nameOverride["uni"];
  // Equipment-specific override
  if (m.nameOverride?.[eq]) {
    const base = m.nameOverride[eq]!;
    if (uni) {
      return isLower(m.primary[0])
        ? `Single-Leg ${base}`
        : `Single-Arm ${base}`;
    }
    return base;
  }
  // Default naming
  const prefix = EQUIPMENT_NAME_PREFIX[eq];
  const base = prefix === "" ? m.name : `${prefix} ${m.name}`;
  if (uni) {
    return isLower(m.primary[0])
      ? `Single-Leg ${base}`
      : `Single-Arm ${base}`;
  }
  return base;
}

function deriveSecondary(m: Movement, uni: boolean): MuscleKey[] {
  const sec = [...m.secondary];
  if (uni) {
    if (!isLower(m.primary[0])) {
      // Single-arm upper: add obliques
      if (!sec.includes("obliques")) sec.push("obliques");
    } else {
      // Single-leg lower: add abductors, adductors, glutes stabilisers
      if (!sec.includes("abductors")) sec.push("abductors");
      if (!sec.includes("adductors")) sec.push("adductors");
      if (!m.primary.includes("glutes") && !sec.includes("glutes")) sec.push("glutes");
    }
  }
  return [...new Set(sec)];
}

export function compose(movements: Movement[]): Exercise[] {
  const result: Exercise[] = [];

  for (const m of movements) {
    for (const eq of m.equipment) {
      for (const lat of m.laterality) {
        const uni = lat === "unilateral";
        const id = `${m.id}__${eq}${uni ? "__uni" : ""}`;
        const name = deriveName(m, eq, uni);
        const secondary = deriveSecondary(m, uni);
        const group: MuscleGroup = MUSCLE_PRIMARY_GROUP[m.primary[0]];
        const tracking = deriveTracking(m, eq);
        const timeBased = deriveTimeBased(tracking, m);

        result.push({
          id,
          name,
          group,
          primary: [...m.primary],
          secondary,
          equipment: eq,
          tracking,
          timeBased,
          custom: false,
        });
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Movement catalog (~120 movements, all 23 muscles covered)
// ---------------------------------------------------------------------------

export const MOVEMENTS: Movement[] = [
  // =========================================================================
  // CHEST
  // =========================================================================
  {
    id: "bench_press",
    name: "Bench Press",
    primary: ["chest"],
    secondary: ["front_delts", "triceps"],
    equipment: ["barbell", "dumbbell", "smith"],
    laterality: ["bilateral"],
  },
  {
    id: "incline_bench_press",
    name: "Incline Bench Press",
    primary: ["chest"],
    secondary: ["front_delts", "triceps"],
    equipment: ["barbell", "dumbbell", "smith"],
    laterality: ["bilateral"],
  },
  {
    id: "decline_bench_press",
    name: "Decline Bench Press",
    primary: ["chest"],
    secondary: ["triceps", "front_delts"],
    equipment: ["barbell", "dumbbell"],
    laterality: ["bilateral"],
  },
  {
    id: "push_up",
    name: "Push-Up",
    primary: ["chest"],
    secondary: ["front_delts", "triceps"],
    equipment: ["bodyweight"],
    laterality: ["bilateral", "unilateral"],
    nameOverride: { bodyweight: "Push-Up", uni: "Single-Arm Push-Up" },
  },
  {
    id: "chest_dip",
    name: "Chest Dip",
    primary: ["chest"],
    secondary: ["triceps", "front_delts"],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Chest Dip" },
    tracking: "weighted_bodyweight",
  },
  {
    id: "fly",
    name: "Fly",
    primary: ["chest"],
    secondary: [],
    equipment: ["dumbbell", "cable", "machine"],
    laterality: ["bilateral"],
    nameOverride: { machine: "Pec Deck" },
  },
  {
    id: "incline_fly",
    name: "Incline Fly",
    primary: ["chest"],
    secondary: [],
    equipment: ["dumbbell", "cable"],
    laterality: ["bilateral"],
  },
  {
    id: "cable_crossover",
    name: "Cable Crossover",
    primary: ["chest"],
    secondary: [],
    equipment: ["cable"],
    laterality: ["bilateral"],
  },

  // =========================================================================
  // BACK — LATS
  // =========================================================================
  {
    id: "pull_up",
    name: "Pull-Up",
    primary: ["lats"],
    secondary: ["biceps", "rhomboids", "lower_traps"],
    equipment: ["bodyweight", "pullupbar"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Pull-Up", pullupbar: "Pull-Up" },
    tracking: "weighted_bodyweight",
  },
  {
    id: "chin_up",
    name: "Chin-Up",
    primary: ["lats"],
    secondary: ["biceps", "rhomboids"],
    equipment: ["bodyweight", "pullupbar"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Chin-Up", pullupbar: "Chin-Up" },
    tracking: "weighted_bodyweight",
  },
  {
    id: "assisted_pull_up",
    name: "Assisted Pull-Up",
    primary: ["lats"],
    secondary: ["biceps", "rhomboids", "lower_traps"],
    equipment: ["machine"],
    laterality: ["bilateral"],
    tracking: "assisted_bodyweight",
  },
  {
    id: "lat_pulldown",
    name: "Lat Pulldown",
    primary: ["lats"],
    secondary: ["biceps", "rhomboids", "lower_traps"],
    equipment: ["cable", "machine", "bands"],
    laterality: ["bilateral"],
  },
  {
    id: "straight_arm_pulldown",
    name: "Straight-Arm Pulldown",
    primary: ["lats"],
    secondary: [],
    equipment: ["cable", "bands"],
    laterality: ["bilateral"],
  },
  {
    id: "row",
    name: "Row",
    primary: ["lats", "rhomboids"],
    secondary: ["biceps", "rear_delts"],
    equipment: ["barbell", "dumbbell", "cable", "machine", "bands", "kettlebell"],
    laterality: ["bilateral", "unilateral"],
    nameOverride: {
      barbell: "Barbell Row",
      dumbbell: "Dumbbell Row",
      cable: "Seated Cable Row",
      machine: "Machine Row",
      bands: "Band Row",
      kettlebell: "Kettlebell Row",
    },
  },
  {
    id: "pendlay_row",
    name: "Pendlay Row",
    primary: ["lats", "rhomboids"],
    secondary: ["biceps", "rear_delts"],
    equipment: ["barbell"],
    laterality: ["bilateral"],
  },
  {
    id: "t_bar_row",
    name: "T-Bar Row",
    primary: ["lats", "rhomboids"],
    secondary: ["biceps", "upper_traps"],
    equipment: ["barbell"],
    laterality: ["bilateral"],
  },
  {
    id: "inverted_row",
    name: "Inverted Row",
    primary: ["lats", "rhomboids"],
    secondary: ["biceps"],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Inverted Row" },
  },
  {
    id: "chest_supported_row",
    name: "Chest-Supported Row",
    primary: ["lats", "rhomboids"],
    secondary: ["biceps", "rear_delts"],
    equipment: ["dumbbell", "machine"],
    laterality: ["bilateral"],
  },

  // =========================================================================
  // BACK — LOWER BACK / LOWER TRAPS / RHOMBOIDS
  // =========================================================================
  {
    id: "deadlift",
    name: "Deadlift",
    primary: ["lower_back", "glutes", "hamstrings"],
    secondary: ["lats", "quads", "forearms"],
    equipment: ["barbell"],
    laterality: ["bilateral"],
  },
  {
    id: "sumo_deadlift",
    name: "Sumo Deadlift",
    primary: ["glutes", "hamstrings"],
    secondary: ["quads", "lower_back", "adductors"],
    equipment: ["barbell"],
    laterality: ["bilateral"],
  },
  {
    id: "hyperextension",
    name: "Hyperextension",
    primary: ["lower_back"],
    secondary: ["glutes", "hamstrings"],
    equipment: ["bodyweight", "machine"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Hyperextension", machine: "Machine Hyperextension" },
  },
  {
    id: "good_morning",
    name: "Good Morning",
    primary: ["lower_back", "hamstrings"],
    secondary: ["glutes"],
    equipment: ["barbell"],
    laterality: ["bilateral"],
  },
  {
    id: "cable_pull_through",
    name: "Cable Pull-Through",
    primary: ["glutes"],
    secondary: ["hamstrings", "lower_back"],
    equipment: ["cable"],
    laterality: ["bilateral"],
  },
  {
    id: "lower_trap_row",
    name: "Lower Trap Row",
    primary: ["lower_traps"],
    secondary: ["rhomboids"],
    equipment: ["cable", "bands"],
    laterality: ["bilateral"],
  },
  {
    id: "serratus_slide",
    name: "Serratus Wall Slide",
    primary: ["lower_traps"],
    secondary: [],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Serratus Wall Slide" },
  },
  {
    id: "prone_y_raise",
    name: "Prone Y Raise",
    primary: ["lower_traps"],
    secondary: ["rear_delts"],
    equipment: ["bodyweight", "dumbbell"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Prone Y Raise" },
  },

  // =========================================================================
  // TRAPS — UPPER TRAPS / RHOMBOIDS
  // =========================================================================
  {
    id: "shrug",
    name: "Shrug",
    primary: ["upper_traps"],
    secondary: [],
    equipment: ["barbell", "dumbbell", "cable", "smith", "kettlebell"],
    laterality: ["bilateral"],
  },
  {
    id: "upright_row",
    name: "Upright Row",
    primary: ["side_delts", "upper_traps"],
    secondary: ["biceps"],
    equipment: ["barbell", "dumbbell", "cable", "ezbar"],
    laterality: ["bilateral"],
  },
  {
    id: "face_pull",
    name: "Face Pull",
    primary: ["rear_delts", "rhomboids"],
    secondary: ["upper_traps", "biceps"],
    equipment: ["cable", "bands"],
    laterality: ["bilateral"],
  },
  {
    id: "band_pull_apart",
    name: "Band Pull-Apart",
    primary: ["rear_delts", "rhomboids"],
    secondary: ["lower_traps"],
    equipment: ["bands"],
    laterality: ["bilateral"],
    nameOverride: { bands: "Band Pull-Apart" },
  },
  {
    id: "neck_curl",
    name: "Neck Curl",
    primary: ["neck"],
    secondary: [],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Neck Curl" },
  },
  {
    id: "neck_extension",
    name: "Neck Extension",
    primary: ["neck"],
    secondary: [],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Neck Extension" },
  },

  // =========================================================================
  // SHOULDERS
  // =========================================================================
  {
    id: "overhead_press",
    name: "Overhead Press",
    primary: ["front_delts"],
    secondary: ["side_delts", "triceps"],
    equipment: ["barbell", "dumbbell", "smith", "kettlebell", "cable"],
    laterality: ["bilateral", "unilateral"],
  },
  {
    id: "arnold_press",
    name: "Arnold Press",
    primary: ["front_delts"],
    secondary: ["side_delts", "triceps"],
    equipment: ["dumbbell"],
    laterality: ["bilateral", "unilateral"],
  },
  {
    id: "pike_push_up",
    name: "Pike Push-Up",
    primary: ["front_delts"],
    secondary: ["triceps"],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Pike Push-Up" },
  },
  {
    id: "lateral_raise",
    name: "Lateral Raise",
    primary: ["side_delts"],
    secondary: [],
    equipment: ["dumbbell", "cable", "bands", "machine"],
    laterality: ["bilateral", "unilateral"],
  },
  {
    id: "front_raise",
    name: "Front Raise",
    primary: ["front_delts"],
    secondary: [],
    equipment: ["dumbbell", "cable", "barbell", "bands"],
    laterality: ["bilateral", "unilateral"],
  },
  {
    id: "rear_delt_fly",
    name: "Rear Delt Fly",
    primary: ["rear_delts"],
    secondary: ["rhomboids"],
    equipment: ["dumbbell", "cable", "machine", "bands"],
    laterality: ["bilateral", "unilateral"],
    nameOverride: { machine: "Reverse Pec Deck" },
  },

  // =========================================================================
  // TRICEPS
  // =========================================================================
  {
    id: "triceps_pushdown",
    name: "Triceps Pushdown",
    primary: ["triceps"],
    secondary: [],
    equipment: ["cable", "bands"],
    laterality: ["bilateral", "unilateral"],
  },
  {
    id: "overhead_triceps_extension",
    name: "Overhead Triceps Extension",
    primary: ["triceps"],
    secondary: [],
    equipment: ["dumbbell", "cable", "bands", "ezbar"],
    laterality: ["bilateral", "unilateral"],
  },
  {
    id: "skullcrusher",
    name: "Skullcrusher",
    primary: ["triceps"],
    secondary: [],
    equipment: ["barbell", "dumbbell", "ezbar"],
    laterality: ["bilateral"],
  },
  {
    id: "close_grip_bench_press",
    name: "Close-Grip Bench Press",
    primary: ["triceps"],
    secondary: ["chest"],
    equipment: ["barbell", "smith"],
    laterality: ["bilateral"],
  },
  {
    id: "triceps_dip",
    name: "Triceps Dip",
    primary: ["triceps"],
    secondary: ["chest", "front_delts"],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Triceps Dip" },
    tracking: "weighted_bodyweight",
  },
  {
    id: "bench_dip",
    name: "Bench Dip",
    primary: ["triceps"],
    secondary: [],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Bench Dip" },
  },
  {
    id: "diamond_push_up",
    name: "Diamond Push-Up",
    primary: ["triceps"],
    secondary: ["chest"],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Diamond Push-Up" },
  },

  // =========================================================================
  // BICEPS
  // =========================================================================
  {
    id: "curl",
    name: "Curl",
    primary: ["biceps"],
    secondary: [],
    equipment: ["barbell", "dumbbell", "cable", "bands", "machine", "ezbar"],
    laterality: ["bilateral", "unilateral"],
    nameOverride: {
      barbell: "Barbell Curl",
      dumbbell: "Dumbbell Curl",
      cable: "Cable Curl",
      bands: "Band Curl",
      machine: "Preacher Curl",
      ezbar: "EZ-Bar Curl",
    },
  },
  {
    id: "hammer_curl",
    name: "Hammer Curl",
    primary: ["biceps"],
    secondary: ["forearms"],
    equipment: ["dumbbell", "cable", "bands"],
    laterality: ["bilateral", "unilateral"],
  },
  {
    id: "incline_curl",
    name: "Incline Curl",
    primary: ["biceps"],
    secondary: [],
    equipment: ["dumbbell"],
    laterality: ["bilateral", "unilateral"],
  },
  {
    id: "concentration_curl",
    name: "Concentration Curl",
    primary: ["biceps"],
    secondary: [],
    equipment: ["dumbbell"],
    laterality: ["unilateral"],
    nameOverride: { uni: "Concentration Curl" },
  },

  // =========================================================================
  // FOREARMS
  // =========================================================================
  {
    id: "wrist_curl",
    name: "Wrist Curl",
    primary: ["forearms"],
    secondary: [],
    equipment: ["dumbbell", "barbell", "cable"],
    laterality: ["bilateral", "unilateral"],
  },
  {
    id: "reverse_curl",
    name: "Reverse Curl",
    primary: ["forearms"],
    secondary: ["biceps"],
    equipment: ["barbell", "dumbbell", "ezbar", "cable"],
    laterality: ["bilateral", "unilateral"],
  },
  {
    id: "farmer_carry",
    name: "Farmer Carry",
    primary: ["forearms"],
    secondary: ["upper_traps"],
    equipment: ["dumbbell", "kettlebell", "barbell"],
    laterality: ["bilateral", "unilateral"],
    tracking: "weight_duration",
    timeBased: true,
    nameOverride: { bodyweight: "Farmer Carry" },
  },

  // =========================================================================
  // QUADS
  // =========================================================================
  {
    id: "back_squat",
    name: "Back Squat",
    primary: ["quads"],
    secondary: ["glutes", "hamstrings"],
    equipment: ["barbell", "smith"],
    laterality: ["bilateral"],
  },
  {
    id: "front_squat",
    name: "Front Squat",
    primary: ["quads"],
    secondary: ["glutes"],
    equipment: ["barbell", "dumbbell"],
    laterality: ["bilateral"],
  },
  {
    id: "goblet_squat",
    name: "Goblet Squat",
    primary: ["quads"],
    secondary: ["glutes"],
    equipment: ["dumbbell", "kettlebell"],
    laterality: ["bilateral"],
  },
  {
    id: "bodyweight_squat",
    name: "Squat",
    primary: ["quads"],
    secondary: ["glutes"],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Bodyweight Squat" },
  },
  {
    id: "leg_press",
    name: "Leg Press",
    primary: ["quads"],
    secondary: ["glutes", "hamstrings"],
    equipment: ["machine"],
    laterality: ["bilateral"],
    nameOverride: { machine: "Leg Press" },
  },
  {
    id: "lunge",
    name: "Lunge",
    primary: ["quads"],
    secondary: ["glutes"],
    equipment: ["bodyweight", "dumbbell", "barbell"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Lunge" },
  },
  {
    id: "walking_lunge",
    name: "Walking Lunge",
    primary: ["quads"],
    secondary: ["glutes"],
    equipment: ["bodyweight", "dumbbell", "barbell"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Walking Lunge" },
  },
  {
    id: "bulgarian_split_squat",
    name: "Bulgarian Split Squat",
    primary: ["quads"],
    secondary: ["glutes"],
    equipment: ["bodyweight", "dumbbell", "barbell"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Bulgarian Split Squat" },
  },
  {
    id: "leg_extension",
    name: "Leg Extension",
    primary: ["quads"],
    secondary: [],
    equipment: ["machine"],
    laterality: ["bilateral"],
  },
  {
    id: "hack_squat",
    name: "Hack Squat",
    primary: ["quads"],
    secondary: ["glutes"],
    equipment: ["machine", "barbell"],
    laterality: ["bilateral"],
  },
  {
    id: "step_up",
    name: "Step-Up",
    primary: ["quads"],
    secondary: ["glutes"],
    equipment: ["bodyweight", "dumbbell"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Step-Up" },
  },
  {
    id: "wall_sit",
    name: "Wall Sit",
    primary: ["quads"],
    secondary: ["glutes"],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Wall Sit" },
    tracking: "duration",
    timeBased: true,
  },
  {
    id: "sissy_squat",
    name: "Sissy Squat",
    primary: ["quads"],
    secondary: [],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Sissy Squat" },
  },

  // =========================================================================
  // HAMSTRINGS
  // =========================================================================
  {
    id: "romanian_deadlift",
    name: "Romanian Deadlift",
    primary: ["hamstrings"],
    secondary: ["glutes", "lower_back"],
    equipment: ["barbell", "dumbbell", "cable"],
    laterality: ["bilateral"],
  },
  {
    id: "leg_curl",
    name: "Leg Curl",
    primary: ["hamstrings"],
    secondary: [],
    equipment: ["machine", "cable"],
    laterality: ["bilateral"],
    nameOverride: {
      machine: "Leg Curl",
      cable: "Cable Leg Curl",
    },
  },
  {
    id: "nordic_curl",
    name: "Nordic Curl",
    primary: ["hamstrings"],
    secondary: [],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Nordic Curl" },
  },
  {
    id: "stiff_leg_deadlift",
    name: "Stiff-Leg Deadlift",
    primary: ["hamstrings"],
    secondary: ["lower_back", "glutes"],
    equipment: ["barbell", "dumbbell"],
    laterality: ["bilateral"],
  },
  {
    id: "glute_ham_raise",
    name: "Glute-Ham Raise",
    primary: ["hamstrings"],
    secondary: ["glutes"],
    equipment: ["bodyweight", "machine"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Glute-Ham Raise" },
  },

  // =========================================================================
  // GLUTES
  // =========================================================================
  {
    id: "hip_thrust",
    name: "Hip Thrust",
    primary: ["glutes"],
    secondary: ["hamstrings"],
    equipment: ["barbell", "dumbbell", "bands", "smith", "machine"],
    laterality: ["bilateral"],
  },
  {
    id: "glute_bridge",
    name: "Glute Bridge",
    primary: ["glutes"],
    secondary: ["hamstrings"],
    equipment: ["bodyweight", "barbell", "bands"],
    laterality: ["bilateral", "unilateral"],
    nameOverride: { bodyweight: "Glute Bridge" },
  },
  {
    id: "cable_kickback",
    name: "Cable Kickback",
    primary: ["glutes"],
    secondary: [],
    equipment: ["cable", "bands"],
    laterality: ["bilateral"],
    nameOverride: { cable: "Cable Kickback", bands: "Band Kickback" },
  },
  {
    id: "kettlebell_swing",
    name: "Kettlebell Swing",
    primary: ["glutes"],
    secondary: ["hamstrings", "lower_back"],
    equipment: ["kettlebell"],
    laterality: ["bilateral"],
    nameOverride: { kettlebell: "Kettlebell Swing" },
  },
  {
    id: "donkey_kick",
    name: "Donkey Kick",
    primary: ["glutes"],
    secondary: [],
    equipment: ["bodyweight", "cable"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Donkey Kick", cable: "Cable Donkey Kick" },
  },

  // =========================================================================
  // ABDUCTORS
  // =========================================================================
  {
    id: "hip_abduction",
    name: "Hip Abduction",
    primary: ["abductors"],
    secondary: ["glutes"],
    equipment: ["machine", "cable", "bands"],
    laterality: ["bilateral"],
  },
  {
    id: "lateral_band_walk",
    name: "Lateral Band Walk",
    primary: ["abductors"],
    secondary: ["glutes"],
    equipment: ["bands"],
    laterality: ["bilateral"],
    nameOverride: { bands: "Lateral Band Walk" },
  },
  {
    id: "clamshell",
    name: "Clamshell",
    primary: ["abductors"],
    secondary: ["glutes"],
    equipment: ["bodyweight", "bands"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Clamshell" },
  },

  // =========================================================================
  // ADDUCTORS
  // =========================================================================
  {
    id: "hip_adduction",
    name: "Hip Adduction",
    primary: ["adductors"],
    secondary: [],
    equipment: ["machine", "cable", "bands"],
    laterality: ["bilateral"],
  },
  {
    id: "sumo_squat",
    name: "Sumo Squat",
    primary: ["adductors"],
    secondary: ["glutes", "quads"],
    equipment: ["bodyweight", "dumbbell", "barbell"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Sumo Squat" },
  },
  {
    id: "copenhagen_plank",
    name: "Copenhagen Plank",
    primary: ["adductors"],
    secondary: ["abs"],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Copenhagen Plank" },
    tracking: "duration",
    timeBased: true,
  },

  // =========================================================================
  // CALVES
  // =========================================================================
  {
    id: "calf_raise",
    name: "Calf Raise",
    primary: ["calves"],
    secondary: [],
    equipment: ["machine", "dumbbell", "barbell", "bodyweight"],
    laterality: ["bilateral", "unilateral"],
    nameOverride: {
      machine: "Calf Raise",
      bodyweight: "Calf Raise",
    },
  },
  {
    id: "seated_calf_raise",
    name: "Seated Calf Raise",
    primary: ["calves"],
    secondary: [],
    equipment: ["machine", "dumbbell"],
    laterality: ["bilateral"],
  },
  {
    id: "jump_rope",
    name: "Jump Rope",
    primary: ["calves"],
    secondary: [],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Jump Rope" },
    tracking: "duration",
    timeBased: true,
  },

  // =========================================================================
  // TIBIALIS
  // =========================================================================
  {
    id: "tibialis_raise",
    name: "Tibialis Raise",
    primary: ["tibialis"],
    secondary: [],
    equipment: ["bodyweight", "bands"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Tibialis Raise" },
  },
  {
    id: "toe_raise",
    name: "Toe Raise",
    primary: ["tibialis"],
    secondary: [],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Toe Raise" },
  },

  // =========================================================================
  // HIP FLEXORS
  // =========================================================================
  {
    id: "hanging_leg_raise",
    name: "Hanging Leg Raise",
    primary: ["hip_flexors", "abs"],
    secondary: [],
    equipment: ["pullupbar", "bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { pullupbar: "Hanging Leg Raise", bodyweight: "Hanging Leg Raise" },
  },
  {
    id: "lying_leg_raise",
    name: "Lying Leg Raise",
    primary: ["hip_flexors", "abs"],
    secondary: [],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Lying Leg Raise" },
  },
  {
    id: "mountain_climber",
    name: "Mountain Climber",
    primary: ["hip_flexors"],
    secondary: ["abs"],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Mountain Climber" },
  },
  {
    id: "hip_flexor_march",
    name: "Hip Flexor March",
    primary: ["hip_flexors"],
    secondary: [],
    equipment: ["bodyweight", "cable"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Hip Flexor March" },
  },

  // =========================================================================
  // ABS
  // =========================================================================
  {
    id: "crunch",
    name: "Crunch",
    primary: ["abs"],
    secondary: ["obliques"],
    equipment: ["bodyweight", "cable", "machine"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Crunch", cable: "Cable Crunch", machine: "Machine Crunch" },
  },
  {
    id: "sit_up",
    name: "Sit-Up",
    primary: ["abs"],
    secondary: ["obliques"],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Sit-Up" },
  },
  {
    id: "plank",
    name: "Plank",
    primary: ["abs"],
    secondary: ["obliques"],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Plank" },
    tracking: "duration",
    timeBased: true,
  },
  {
    id: "ab_wheel_rollout",
    name: "Ab Wheel Rollout",
    primary: ["abs"],
    secondary: ["obliques"],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Ab Wheel Rollout" },
  },
  {
    id: "hollow_hold",
    name: "Hollow Hold",
    primary: ["abs"],
    secondary: [],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Hollow Hold" },
    tracking: "duration",
    timeBased: true,
  },
  {
    id: "v_up",
    name: "V-Up",
    primary: ["abs"],
    secondary: ["hip_flexors"],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "V-Up" },
  },
  {
    id: "dead_bug",
    name: "Dead Bug",
    primary: ["abs"],
    secondary: [],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Dead Bug" },
  },
  {
    id: "dragon_flag",
    name: "Dragon Flag",
    primary: ["abs"],
    secondary: ["obliques"],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Dragon Flag" },
  },

  // =========================================================================
  // OBLIQUES
  // =========================================================================
  {
    id: "side_bend",
    name: "Side Bend",
    primary: ["obliques"],
    secondary: ["lower_back"],
    equipment: ["dumbbell", "cable", "barbell", "bands"],
    laterality: ["bilateral"],
  },
  {
    id: "russian_twist",
    name: "Russian Twist",
    primary: ["obliques"],
    secondary: ["abs"],
    equipment: ["bodyweight", "dumbbell", "kettlebell"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Russian Twist" },
  },
  {
    id: "cable_woodchopper",
    name: "Cable Woodchopper",
    primary: ["obliques"],
    secondary: ["abs"],
    equipment: ["cable", "bands"],
    laterality: ["bilateral"],
  },
  {
    id: "side_plank",
    name: "Side Plank",
    primary: ["obliques"],
    secondary: ["abs"],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Side Plank" },
    tracking: "duration",
    timeBased: true,
  },
  {
    id: "bicycle_crunch",
    name: "Bicycle Crunch",
    primary: ["obliques"],
    secondary: ["abs"],
    equipment: ["bodyweight"],
    laterality: ["bilateral"],
    nameOverride: { bodyweight: "Bicycle Crunch" },
  },
];
