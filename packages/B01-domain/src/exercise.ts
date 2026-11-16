import { z } from "zod";
import { MUSCLE_NAMES, MuscleKeySchema, MuscleGroupSchema } from "./muscles";
import { EquipmentSchema } from "./equipment";
import { TrackingTypeSchema } from "./tracking";

/** A single exercise definition (catalog or user custom). */
export const ExerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  group: MuscleGroupSchema,
  primary: z.array(MuscleKeySchema).min(1),
  secondary: z.array(MuscleKeySchema),
  equipment: EquipmentSchema,
  tracking: TrackingTypeSchema,
  custom: z.boolean().optional(),
});

export type Exercise = z.infer<typeof ExerciseSchema>;

/** Display names of the muscles an exercise works, primary ones first. */
export function muscleNames(exercise: Pick<Exercise, "primary" | "secondary">): string[] {
  return [...exercise.primary, ...exercise.secondary].map((muscle) => MUSCLE_NAMES[muscle]);
}
