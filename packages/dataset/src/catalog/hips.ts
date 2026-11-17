import type { Movement } from "../movement";

export const HIPS: Movement[] = [
  // Glutes
  {
    id: "hip_thrust",
    name: "Hip Thrust",
    primary: ["glutes"],
    secondary: ["hamstrings"],
    equipment: ["barbell", "dumbbell", "bands", "smith", "machine"],
  },
  {
    id: "glute_bridge",
    name: "Glute Bridge",
    primary: ["glutes"],
    secondary: ["hamstrings"],
    equipment: ["bodyweight", "barbell", "bands"],
    laterality: ["bilateral", "unilateral"],
  },
  {
    id: "cable_kickback",
    name: "Cable Kickback",
    primary: ["glutes"],
    secondary: [],
    equipment: ["cable", "bands"],
    nameOverride: { cable: "Cable Kickback", bands: "Band Kickback" },
  },
  {
    id: "kettlebell_swing",
    name: "Kettlebell Swing",
    primary: ["glutes"],
    secondary: ["hamstrings", "lower_back"],
    equipment: ["kettlebell"],
    nameOverride: { kettlebell: "Kettlebell Swing" },
  },
  {
    id: "donkey_kick",
    name: "Donkey Kick",
    primary: ["glutes"],
    secondary: [],
    equipment: ["bodyweight", "cable"],
  },

  // Abductors
  {
    id: "hip_abduction",
    name: "Hip Abduction",
    primary: ["abductors"],
    secondary: ["glutes"],
    equipment: ["machine", "cable", "bands"],
  },
  {
    id: "lateral_band_walk",
    name: "Lateral Band Walk",
    primary: ["abductors"],
    secondary: ["glutes"],
    equipment: ["bands"],
    nameOverride: { bands: "Lateral Band Walk" },
  },
  {
    id: "clamshell",
    name: "Clamshell",
    primary: ["abductors"],
    secondary: ["glutes"],
    equipment: ["bodyweight", "bands"],
  },

  // Adductors
  {
    id: "hip_adduction",
    name: "Hip Adduction",
    primary: ["adductors"],
    secondary: [],
    equipment: ["machine", "cable", "bands"],
  },
  {
    id: "sumo_squat",
    name: "Sumo Squat",
    primary: ["adductors"],
    secondary: ["glutes", "quads"],
    equipment: ["bodyweight", "dumbbell", "barbell"],
  },
  {
    id: "copenhagen_plank",
    name: "Copenhagen Plank",
    primary: ["adductors"],
    secondary: ["abs"],
    equipment: ["bodyweight"],
    tracking: "duration",
  },
];

export const HIP_FLEXORS: Movement[] = [
  {
    id: "hanging_leg_raise",
    name: "Hanging Leg Raise",
    primary: ["hip_flexors", "abs"],
    secondary: [],
    equipment: ["pullupbar", "bodyweight"],
  },
  {
    id: "lying_leg_raise",
    name: "Lying Leg Raise",
    primary: ["hip_flexors", "abs"],
    secondary: [],
    equipment: ["bodyweight"],
  },
  {
    id: "mountain_climber",
    name: "Mountain Climber",
    primary: ["hip_flexors"],
    secondary: ["abs"],
    equipment: ["bodyweight"],
  },
  {
    id: "hip_flexor_march",
    name: "Hip Flexor March",
    primary: ["hip_flexors"],
    secondary: [],
    equipment: ["bodyweight", "cable"],
  },
];
