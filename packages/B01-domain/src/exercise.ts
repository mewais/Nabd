import { z } from "zod";
import { MuscleKeySchema, MuscleGroupSchema } from "./muscles";
import { EquipmentSchema } from "./equipment";
import { TrackingTypeSchema } from "./tracking";

/**
 * A single exercise definition (seed, re-tagged dataset, or user custom).
 * `timeBased` mirrors tracking but is kept explicit for fast scheduling checks.
 */
export const ExerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  group: MuscleGroupSchema,
  primary: z.array(MuscleKeySchema).min(1),
  secondary: z.array(MuscleKeySchema),
  equipment: EquipmentSchema,
  tracking: TrackingTypeSchema,
  timeBased: z.boolean().optional(),
  custom: z.boolean().optional(),
});

export type Exercise = z.infer<typeof ExerciseSchema>;

export const ExerciseListSchema = z.array(ExerciseSchema);
