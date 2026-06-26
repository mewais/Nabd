import { z } from "zod";

/** Canonical equipment keys (the prototype's 11). */
export const EQUIPMENT_KEYS = [
  "bodyweight",
  "dumbbell",
  "barbell",
  "ezbar",
  "kettlebell",
  "bands",
  "pullupbar",
  "bench",
  "cable",
  "machine",
  "smith",
] as const;

export type Equipment = (typeof EQUIPMENT_KEYS)[number];

export const EquipmentSchema = z.enum(EQUIPMENT_KEYS);

export const EQUIPMENT_NAMES: Record<Equipment, string> = {
  bodyweight: "Bodyweight",
  dumbbell: "Dumbbells",
  barbell: "Barbell",
  ezbar: "EZ-bar",
  kettlebell: "Kettlebell",
  bands: "Resistance bands",
  pullupbar: "Pull-up bar",
  bench: "Bench",
  cable: "Cable machine",
  machine: "Plate / pin machines",
  smith: "Smith machine",
};

