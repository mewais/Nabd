import type { Movement } from "../movement";

export const CORE: Movement[] = [
  // Abs
  {
    id: "crunch",
    name: "Crunch",
    primary: ["abs"],
    secondary: ["obliques"],
    equipment: ["bodyweight", "cable", "machine"],
  },
  {
    id: "sit_up",
    name: "Sit-Up",
    primary: ["abs"],
    secondary: ["obliques"],
    equipment: ["bodyweight"],
  },
  {
    id: "plank",
    name: "Plank",
    primary: ["abs"],
    secondary: ["obliques"],
    equipment: ["bodyweight"],
    tracking: "duration",
  },
  {
    id: "ab_wheel_rollout",
    name: "Ab Wheel Rollout",
    primary: ["abs"],
    secondary: ["obliques"],
    equipment: ["bodyweight"],
  },
  {
    id: "hollow_hold",
    name: "Hollow Hold",
    primary: ["abs"],
    secondary: [],
    equipment: ["bodyweight"],
    tracking: "duration",
  },
  {
    id: "v_up",
    name: "V-Up",
    primary: ["abs"],
    secondary: ["hip_flexors"],
    equipment: ["bodyweight"],
  },
  {
    id: "dead_bug",
    name: "Dead Bug",
    primary: ["abs"],
    secondary: [],
    equipment: ["bodyweight"],
  },
  {
    id: "dragon_flag",
    name: "Dragon Flag",
    primary: ["abs"],
    secondary: ["obliques"],
    equipment: ["bodyweight"],
  },

  // Obliques
  {
    id: "side_bend",
    name: "Side Bend",
    primary: ["obliques"],
    secondary: ["lower_back"],
    equipment: ["dumbbell", "cable", "barbell", "bands"],
  },
  {
    id: "russian_twist",
    name: "Russian Twist",
    primary: ["obliques"],
    secondary: ["abs"],
    equipment: ["bodyweight", "dumbbell", "kettlebell"],
  },
  {
    id: "cable_woodchopper",
    name: "Cable Woodchopper",
    primary: ["obliques"],
    secondary: ["abs"],
    equipment: ["cable", "bands"],
  },
  {
    id: "side_plank",
    name: "Side Plank",
    primary: ["obliques"],
    secondary: ["abs"],
    equipment: ["bodyweight"],
    tracking: "duration",
  },
  {
    id: "bicycle_crunch",
    name: "Bicycle Crunch",
    primary: ["obliques"],
    secondary: ["abs"],
    equipment: ["bodyweight"],
  },
];
